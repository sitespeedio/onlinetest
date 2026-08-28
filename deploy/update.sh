#!/usr/bin/env bash
# deploy/update.sh — set up or update an onlinetest installation in place.
#
# First run on a fresh host:
#   ./deploy/update.sh --domain=onlinetest.example.com
#   (auto-generates secrets, writes .env, brings everything up)
#
# Every run after that:
#   ./deploy/update.sh
#   (pulls latest images, restarts services)
#
# Usage:
#   ./deploy/update.sh [--mode all-in-one|server|testrunner]
#                      [--domain DOMAIN] [--version X.Y.Z]
#
# Examples:
#   ./deploy/update.sh --domain=foo.com           # first install (all-in-one)
#   ./deploy/update.sh                            # subsequent update
#   ./deploy/update.sh --mode server              # multi-server, server box
#   ./deploy/update.sh --mode testrunner          # multi-server, testrunner box
#   ./deploy/update.sh --version 3.4.0            # pin server & testrunner to 3.4.0
#
# Modes:
#   all-in-one  — single host running Caddy + server + testrunner + deps.
#                 Uses deploy/docker-compose.production.yml. First-run install
#                 (auto-generated secrets, DOMAIN prompt) only runs in this mode.
#   server      — multi-server "server" host running deps + server only.
#                 Uses deploy/docker-compose.production-server.yml.
#   testrunner  — multi-server "testrunner" host.
#                 Uses deploy/docker-compose.production-testrunner.yml.
#
# Requirements: docker, docker compose v2, .env at the repo root (auto-created
# from .env.example on first run in all-in-one mode).

set -euo pipefail

MODE="all-in-one"
VERSION=""
DOMAIN_ARG=""
NO_START=0

usage() {
  sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      if [ -z "$MODE" ]; then echo "--mode requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --mode=*)
      MODE="${1#--mode=}"
      shift
      ;;
    --version)
      VERSION="${2:-}"
      if [ -z "$VERSION" ]; then echo "--version requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --version=*)
      VERSION="${1#--version=}"
      shift
      ;;
    --domain)
      DOMAIN_ARG="${2:-}"
      if [ -z "$DOMAIN_ARG" ]; then echo "--domain requires a value" >&2; exit 1; fi
      shift 2
      ;;
    --domain=*)
      DOMAIN_ARG="${1#--domain=}"
      shift
      ;;
    --no-start)
      # Run the install steps (generate secrets, write .env, etc.) but skip
      # `docker compose pull/up`. Useful for CI / inspecting the generated
      # .env before bringing services up.
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

# ─── sanity checks ────────────────────────────────────────────────────────────

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker not found in PATH" >&2
    echo "       Install docker: https://docs.docker.com/engine/install/" >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: docker compose v2 not available (this script does not use docker-compose v1)" >&2
    exit 1
  fi
}

require_openssl() {
  if ! command -v openssl >/dev/null 2>&1; then
    echo "Error: openssl not found in PATH (needed to generate secrets on first run)" >&2
    exit 1
  fi
}

# ─── install-path helpers ─────────────────────────────────────────────────────

# Echoes "install" if this looks like a first run (no .env, or any
# VARNAME=CHANGE_ME_… placeholder still present); echoes "update" otherwise.
# The pattern is intentionally strict so comment text mentioning CHANGE_ME
# (e.g. in .env.example's header) does not trigger an install loop.
detect_run_mode() {
  if [ ! -f .env ]; then
    echo install
  elif grep -qE '^[A-Z_]+=CHANGE_ME_' .env; then
    echo install
  else
    echo update
  fi
}

generate_secret() {
  # base64 of 24 random bytes → 32 chars, alphabet [A-Za-z0-9+/=]. No newlines.
  openssl rand -base64 24 | tr -d '\n'
}

# For every line of the form `VARNAME=CHANGE_ME_*` in .env, generate a fresh
# secret and write it back atomically. Logs the variables that got filled in
# so the user sees what happened. User-set values are preserved untouched.
fill_env_placeholders() {
  local tmp filled=() varname secret
  tmp="$(mktemp "${REPO_ROOT}/.env.fill.XXXXXX")"
  trap 'rm -f "$tmp"' RETURN

  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^([A-Z_]+)=CHANGE_ME_ ]]; then
      varname="${BASH_REMATCH[1]}"
      secret="$(generate_secret)"
      printf '%s=%s\n' "$varname" "$secret" >> "$tmp"
      filled+=("$varname")
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < .env

  mv "$tmp" .env
  trap - RETURN

  if [ "${#filled[@]}" -gt 0 ]; then
    echo ">> Generated secrets for: ${filled[*]}"
  fi
}

# Set DOMAIN=<value> in .env and derive RESULT_BASE_URL +
# SITESPEED.IO_HTML_HOMEURL from it. Handles existing uncommented lines,
# commented-out lines, and missing lines (append).
set_env_domain() {
  local value="$1" tmp
  local result_url="https://${value}/sitespeedio"
  local home_url="https://${value}/"

  tmp="$(mktemp "${REPO_ROOT}/.env.dom.XXXXXX")"
  trap 'rm -f "$tmp"' RETURN

  local saw_domain=0 saw_result=0 saw_home=0
  # .env.example may contain both an uncommented line and a commented example
  # for the same variable. Replace only the first match for each variable;
  # drop any subsequent matches so the resulting .env has exactly one line
  # per variable.
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^DOMAIN= ]] || [[ "$line" =~ ^[[:space:]]*#[[:space:]]*DOMAIN= ]]; then
      if [ "$saw_domain" -eq 0 ]; then
        printf 'DOMAIN=%s\n' "$value" >> "$tmp"
        saw_domain=1
      fi
    elif [[ "$line" =~ ^RESULT_BASE_URL= ]] || [[ "$line" =~ ^[[:space:]]*#[[:space:]]*RESULT_BASE_URL= ]]; then
      if [ "$saw_result" -eq 0 ]; then
        printf 'RESULT_BASE_URL="%s"\n' "$result_url" >> "$tmp"
        saw_result=1
      fi
    elif [[ "$line" =~ ^SITESPEED\.IO_HTML_HOMEURL= ]] || [[ "$line" =~ ^[[:space:]]*#[[:space:]]*SITESPEED\.IO_HTML_HOMEURL= ]]; then
      if [ "$saw_home" -eq 0 ]; then
        printf 'SITESPEED.IO_HTML_HOMEURL="%s"\n' "$home_url" >> "$tmp"
        saw_home=1
      fi
    else
      printf '%s\n' "$line" >> "$tmp"
    fi
  done < .env

  if [ "$saw_domain" -eq 0 ]; then printf 'DOMAIN=%s\n' "$value" >> "$tmp"; fi
  if [ "$saw_result" -eq 0 ]; then printf 'RESULT_BASE_URL="%s"\n' "$result_url" >> "$tmp"; fi
  if [ "$saw_home" -eq 0 ]; then printf 'SITESPEED.IO_HTML_HOMEURL="%s"\n' "$home_url" >> "$tmp"; fi

  mv "$tmp" .env
  trap - RETURN
}

# Echo the DOMAIN value to use: --domain flag wins, else interactive prompt.
prompt_domain() {
  if [ -n "$DOMAIN_ARG" ]; then
    printf '%s' "$DOMAIN_ARG"
    return
  fi
  local value=""
  while [ -z "$value" ]; do
    printf 'Enter the public domain for this onlinetest instance (e.g. onlinetest.example.com): ' >&2
    if ! IFS= read -r value </dev/tty; then
      echo "" >&2
      echo "Error: cannot read DOMAIN interactively (no tty). Pass --domain=foo.com instead." >&2
      exit 1
    fi
    if [ -z "$value" ]; then
      echo "  (required — must not be empty)" >&2
    fi
  done
  printf '%s' "$value"
}

# Read a value from .env. Echoes empty if the key isn't present.
read_env() {
  local key="$1"
  if [ ! -f .env ]; then return; fi
  grep -E "^${key}=" .env | head -1 | sed -e "s/^${key}=//" -e 's/^"//' -e 's/"$//'
}

# ─── version pin ──────────────────────────────────────────────────────────────

pin_versions() {
  local tmp
  tmp="$(mktemp "${REPO_ROOT}/.env.update.XXXXXX")"
  trap 'rm -f "$tmp"' RETURN
  awk -v v="$VERSION" '
    /^SITESPEED_IO_SERVER_VERSION=/ { print "SITESPEED_IO_SERVER_VERSION=" v; next }
    /^SITESPEED_IO_TESTRUNNER_VERSION=/ { print "SITESPEED_IO_TESTRUNNER_VERSION=" v; next }
    { print }
  ' .env > "$tmp"
  mv "$tmp" .env
  trap - RETURN
  echo "Pinned server/testrunner versions to $VERSION in .env"
}

# ─── compose actions ──────────────────────────────────────────────────────────

compose_pull() {
  echo ">> Pulling images (mode=$MODE)…"
  docker compose "${COMPOSE_FILES[@]}" pull
}

compose_up() {
  echo ">> Restarting services…"
  docker compose "${COMPOSE_FILES[@]}" up -d --remove-orphans
}

compose_status() {
  echo ">> Container status:"
  docker compose "${COMPOSE_FILES[@]}" ps
}

compose_tail_logs() {
  echo ">> Tailing logs for 10 seconds (Ctrl+C to keep watching)…"
  # `timeout` returns 124 when it kills the process — that's the success path
  # here, so swallow the non-zero exit. Plain `|| true` keeps `set -e` happy.
  timeout 10 docker compose "${COMPOSE_FILES[@]}" logs --tail 30 -f || true
}

# ─── end-of-run messages ──────────────────────────────────────────────────────

print_install_summary() {
  local domain admin_login admin_pw valid_domains
  domain="$(read_env DOMAIN)"
  admin_login="$(read_env ADMIN_BASICAUTH_LOGIN)"
  admin_pw="$(read_env ADMIN_BASICAUTH_PASSWORD)"
  valid_domains="$(read_env VALID_TEST_DOMAINS)"

  cat <<EOF

================================================================
 onlinetest installed.

  Dashboard:        https://${domain}/
  Admin URL:        https://${domain}/admin/
  Admin login:      ${admin_login}
  Admin password:   ${admin_pw}

  (Generated secrets are stored in .env at the repo root.)

  NEXT STEPS
   - Point DNS for ${domain} at this server's IP. Caddy will issue a
     Let's Encrypt cert on first request once DNS resolves.
   - Test it: curl https://${domain}/api/
EOF

  if [ "$valid_domains" = ".*" ]; then
    cat <<'EOF'

  WARNING: VALID_TEST_DOMAINS is set to ".*" — your instance accepts test
  submissions for ANY URL. If this server is reachable from the public
  internet, you should either:
    - set VALID_TEST_DOMAINS in .env to restrict (then rerun this script), or
    - configure basicAuth in server/config/server.yaml, or
    - configure api.key in server/config/server.yaml
EOF
  fi

  echo "================================================================"
}

print_migration_hints() {
  if [ -f redis-conf/redis.conf ] && grep -qE '^[[:space:]]*requirepass[[:space:]]' redis-conf/redis.conf; then
    cat <<'EOF'

  Note: redis-conf/redis.conf still contains a "requirepass" line.
  The redis password is now passed via the docker-compose command line
  and the config-file line is ignored. You can safely delete it from
  redis-conf/redis.conf.
EOF
  fi
}

# ─── main flow ────────────────────────────────────────────────────────────────

require_docker

case "$MODE" in
  all-in-one)
    COMPOSE_FILES=(-f deploy/docker-compose.production.yml)
    ;;
  server)
    COMPOSE_FILES=(-f deploy/docker-compose.production-server.yml)
    ;;
  testrunner)
    COMPOSE_FILES=(-f deploy/docker-compose.production-testrunner.yml)
    ;;
  *)
    echo "Unknown --mode: $MODE (expected all-in-one|server|testrunner)" >&2
    exit 1
    ;;
esac

# Compose v2 reads .env from the *project directory* (defaults to the dir of
# the first -f file), not the CWD. The production compose files live under
# deploy/ but .env is at the repo root — so we point compose at it explicitly.
# Only do this once .env exists; on first run the install path creates it
# before we ever call compose.
COMPOSE_FILES=(--env-file .env "${COMPOSE_FILES[@]}")

RUN_MODE="$(detect_run_mode)"

if [ "$RUN_MODE" = "install" ]; then
  # The install path (auto-generate secrets, prompt for DOMAIN) only runs for
  # all-in-one. server/testrunner boxes still need a hand-prepared .env that
  # matches the server's secrets — that workflow is a separate piece of work.
  if [ "$MODE" != "all-in-one" ]; then
    if [ ! -f .env ]; then
      echo "Error: .env not found at $REPO_ROOT/.env" >&2
      echo "       For multi-server setups, copy .env from the server box and" >&2
      echo "       adjust per deploy/PRODUCTION.md before running this script." >&2
      exit 1
    fi
    echo "Warning: .env still contains CHANGE_ME placeholders. The install" >&2
    echo "         flow only auto-fills these in --mode all-in-one. Fix .env" >&2
    echo "         by hand or rerun with --mode all-in-one." >&2
    exit 1
  fi

  require_openssl
  echo ">> First run detected — installing onlinetest in all-in-one mode."
  if [ ! -f .env ]; then
    echo ">> Creating .env from .env.example"
    cp .env.example .env
  fi
  DOMAIN_VALUE="$(prompt_domain)"
  set_env_domain "$DOMAIN_VALUE"
  fill_env_placeholders
elif [ -n "$DOMAIN_ARG" ]; then
  echo "Warning: --domain ignored — DOMAIN is already set in .env." >&2
  echo "         To change it, edit .env and restart services." >&2
fi

if [ -n "$VERSION" ]; then
  pin_versions
fi

if [ "$NO_START" -eq 1 ]; then
  echo ">> --no-start: skipping docker compose pull/up. .env is ready at $REPO_ROOT/.env."
  exit 0
fi

compose_pull
compose_up
compose_status
compose_tail_logs

if [ "$RUN_MODE" = "install" ]; then
  print_install_summary
else
  print_migration_hints
fi

echo ">> Done."
