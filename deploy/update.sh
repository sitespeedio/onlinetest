#!/usr/bin/env bash
# deploy/update.sh — set up or update an onlinetest installation in place.
# Use this on a production host instead of running `docker compose`
# commands by hand.
#
# Usage:
#   ./deploy/update.sh [--mode all-in-one|server|testrunner]
#                      [--domain DOMAIN] [--version X.Y.Z] [--no-start]
#
# Examples:
#   ./deploy/update.sh --domain foo.com           # first install (all-in-one)
#   ./deploy/update.sh                            # all-in-one, versions from .env
#   ./deploy/update.sh --mode server              # server box (multi-server)
#   ./deploy/update.sh --mode testrunner          # testrunner box (multi-server)
#   ./deploy/update.sh --version 3.4.0            # pin server & testrunner to 3.4.0
#
# First install (all-in-one only): when .env is missing or still has
# CHANGE_ME values, the script creates .env from .env.example, generates
# the passwords and sets the domain and the URLs that use it.
# --no-start does only that and does not start the containers.
#
# Modes:
#   all-in-one  — single host running Caddy + server + testrunner + deps.
#                 Uses deploy/docker-compose.production.yml.
#   server      — multi-server "server" host running deps + server only.
#                 Uses deploy/docker-compose.production-server.yml.
#   testrunner  — multi-server "testrunner" host.
#                 Uses deploy/docker-compose.production-testrunner.yml.
#
# Requirements: docker, docker compose v2. For server and testrunner, .env
# at the repo root.

set -euo pipefail

MODE="all-in-one"
VERSION=""
DOMAIN=""
NO_START=0

usage() {
  sed -n '2,31p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  # Accept --option=value as well as --option value
  if [[ "$1" == --*=* ]]; then
    set -- "${1%%=*}" "${1#*=}" "${@:2}"
  fi
  case "$1" in
    --mode)
      MODE="${2:-}"
      if [ -z "$MODE" ]; then echo "--mode requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --version)
      VERSION="${2:-}"
      if [ -z "$VERSION" ]; then echo "--version requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --domain)
      DOMAIN="${2:-}"
      if [ -z "$DOMAIN" ]; then echo "--domain requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --no-start)
      NO_START=1
      shift
      ;;
    -h|--help)
      usage; exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker not found in PATH" >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose v2 not available (this script does not use docker-compose v1)" >&2
  exit 1
fi

# Compose reads .env next to the compose file, not from the repository root,
# so give it the file here. Without it the image tags are empty.
case "$MODE" in
  all-in-one)
    COMPOSE_FILES=(--env-file .env -f deploy/docker-compose.production.yml)
    ;;
  server)
    COMPOSE_FILES=(--env-file .env -f deploy/docker-compose.production-server.yml)
    ;;
  testrunner)
    COMPOSE_FILES=(--env-file .env -f deploy/docker-compose.production-testrunner.yml)
    ;;
  *)
    echo "Unknown --mode: $MODE (expected all-in-one|server|testrunner)" >&2
    exit 1
    ;;
esac

# Set KEY=VALUE in .env. Replace the first KEY= line, remove the other
# KEY= lines, and add the line if it is missing.
set_env() {
  local tmp
  tmp="$(mktemp "${REPO_ROOT}/.env.update.XXXXXX")"
  KEY="$1" VALUE="$2" awk '
    index($0, ENVIRON["KEY"] "=") == 1 { if (!done) print ENVIRON["KEY"] "=" ENVIRON["VALUE"]; done = 1; next }
    { print }
    END { if (!done) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' .env > "$tmp"
  mv "$tmp" .env
}

INSTALL=0
if [ ! -f .env ] || grep -qE '^[A-Z_]+=CHANGE_ME_' .env; then
  if [ "$MODE" != "all-in-one" ]; then
    echo "Error: .env is missing or still has CHANGE_ME values." >&2
    echo "       For multi-server setups, copy .env from the server box and" >&2
    echo "       adjust it per deploy/PRODUCTION.md before running this script." >&2
    exit 1
  fi
  if [ -z "$DOMAIN" ] && [ -t 0 ]; then
    read -r -p "Public domain for this onlinetest instance (for example onlinetest.example.com): " DOMAIN
  fi
  if [ -z "$DOMAIN" ]; then
    echo "Error: first install needs the public domain. Run again with --domain your.domain.com" >&2
    exit 1
  fi

  echo ">> First install: writing .env"
  if [ ! -f .env ]; then
    cp .env.example .env
  fi
  set_env DOMAIN "$DOMAIN"
  set_env RESULT_BASE_URL "\"https://${DOMAIN}/sitespeedio\""
  set_env SITESPEED.IO_HTML_HOMEURL "\"https://${DOMAIN}/\""
  PLACEHOLDERS="$(grep -oE '^[A-Z_]+=CHANGE_ME_' .env | cut -d= -f1)"
  for key in $PLACEHOLDERS; do
    # Hex, because base64 has "+", which is a space in a URL (?api.key=)
    set_env "$key" "$(head -c 24 /dev/urandom | od -An -tx1 | tr -d " \n")"
    echo "   Generated $key"
  done
  chmod 600 .env
  INSTALL=1
elif [ -n "$DOMAIN" ]; then
  echo "Warning: --domain is only used on the first install. To change the domain, edit DOMAIN, RESULT_BASE_URL and SITESPEED.IO_HTML_HOMEURL in .env." >&2
fi

# A new release can add settings to .env.example, but it does not change .env
MISSING="$(comm -23 <(grep -oE '^[A-Za-z_.]+=' .env.example | sort -u) <(grep -oE '^[A-Za-z_.]+=' .env | sort -u) | tr -d =)"
if [ -n "$MISSING" ]; then
  echo "Warning: these settings from .env.example are not in .env. Copy them over:" >&2
  echo "   ${MISSING//$'\n'/$'\n'   }" >&2
fi

if [ -n "$VERSION" ]; then
  # Rewrite the two version pins in .env atomically. awk handles the keys
  # that already exist; we don't add them if they're missing, on the
  # assumption the operator started from .env.example which already
  # documents both.
  TMP="$(mktemp "${REPO_ROOT}/.env.update.XXXXXX")"
  trap 'rm -f "$TMP"' EXIT
  awk -v v="$VERSION" '
    /^SITESPEED_IO_SERVER_VERSION=/ { print "SITESPEED_IO_SERVER_VERSION=" v; next }
    /^SITESPEED_IO_TESTRUNNER_VERSION=/ { print "SITESPEED_IO_TESTRUNNER_VERSION=" v; next }
    { print }
  ' .env > "$TMP"
  mv "$TMP" .env
  trap - EXIT
  echo "Pinned server/testrunner versions to $VERSION in .env"
fi

if [ "$NO_START" -eq 1 ]; then
  echo ">> --no-start: .env is ready, containers not started."
  exit 0
fi

echo ">> Pulling images (mode=$MODE)…"
docker compose "${COMPOSE_FILES[@]}" pull

# The testrunner starts the sitespeed.io container itself, so compose does not
# pull it. Without this, the first image that was pulled stays forever.
if [ "$MODE" != "server" ]; then
  SITESPEED_IO_CONTAINER="$(grep -m1 '^SITESPEED_IO_CONTAINER=' .env | cut -d= -f2- | tr -d '"' || true)"
  if [ -n "$SITESPEED_IO_CONTAINER" ]; then
    docker pull "$SITESPEED_IO_CONTAINER"
  fi
fi

echo ">> Restarting services…"
docker compose "${COMPOSE_FILES[@]}" up -d --remove-orphans

echo ">> Container status:"
docker compose "${COMPOSE_FILES[@]}" ps

echo ">> Tailing logs for 10 seconds (Ctrl+C to keep watching)…"
# `timeout` returns 124 when it kills the process — that's the success path
# here, so swallow the non-zero exit. Plain `|| true` keeps `set -e` happy.
timeout 10 docker compose "${COMPOSE_FILES[@]}" logs --tail 30 -f || true

if [ "$INSTALL" -eq 1 ]; then
  cat <<EOF

================================================================
 onlinetest is installed: https://${DOMAIN}/
 Admin: https://${DOMAIN}/admin/ (the login and password are in .env)

 Point DNS for ${DOMAIN} at this server. Caddy gets a Let's Encrypt
 certificate on the first request after DNS resolves.
EOF
  if grep -qE '^VALID_TEST_DOMAINS=\.\*$' .env; then
    cat <<'EOF'

 WARNING: VALID_TEST_DOMAINS is ".*", so anyone who can reach this
 server can test any URL. Restrict it in .env, or set basicAuth or
 api.key in server/config/server.yaml, then run this script again.
EOF
  fi
  echo "================================================================"
fi

echo ">> Done."
