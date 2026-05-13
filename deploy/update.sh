#!/usr/bin/env bash
# deploy/update.sh — pull the latest onlinetest images and restart services
# in place. Use this on a production host instead of running `docker compose`
# commands by hand.
#
# Usage:
#   ./deploy/update.sh [--mode all-in-one|server|testrunner] [--version X.Y.Z]
#
# Examples:
#   ./deploy/update.sh                            # all-in-one, versions from .env
#   ./deploy/update.sh --mode server              # server box (multi-server)
#   ./deploy/update.sh --mode testrunner          # testrunner box (multi-server)
#   ./deploy/update.sh --version 3.4.0            # pin server & testrunner to 3.4.0
#
# Modes:
#   all-in-one  — single host running Caddy + server + testrunner + deps.
#                 Uses deploy/docker-compose.production.yml.
#   server      — multi-server "server" host running deps + server only.
#                 Uses deploy/docker-compose.production-server.yml.
#   testrunner  — multi-server "testrunner" host.
#                 Uses deploy/docker-compose.production-testrunner.yml.
#
# Requirements: docker, docker compose v2, .env at the repo root.

set -euo pipefail

MODE="all-in-one"
VERSION=""

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
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
if [ ! -f .env ]; then
  echo "Error: .env not found at $REPO_ROOT/.env" >&2
  echo "       Copy .env.example to .env and fill in your secrets before running this." >&2
  exit 1
fi

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

echo ">> Pulling images (mode=$MODE)…"
docker compose "${COMPOSE_FILES[@]}" pull

echo ">> Restarting services…"
docker compose "${COMPOSE_FILES[@]}" up -d --remove-orphans

echo ">> Container status:"
docker compose "${COMPOSE_FILES[@]}" ps

echo ">> Tailing logs for 10 seconds (Ctrl+C to keep watching)…"
# `timeout` returns 124 when it kills the process — that's the success path
# here, so swallow the non-zero exit. Plain `|| true` keeps `set -e` happy.
timeout 10 docker compose "${COMPOSE_FILES[@]}" logs --tail 30 -f || true

echo ">> Done."
