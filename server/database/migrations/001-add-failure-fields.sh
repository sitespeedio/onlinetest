#!/usr/bin/env bash
#
# Helper for applying migration 001-add-failure-fields.sql against a
# Postgres instance running under docker compose. Each subcommand maps
# to one of the steps in server/database/migrations/README.md.
#
# Usage (run from the directory where you normally invoke `docker
# compose` for the stack — the script forwards $COMPOSE_FILE if set,
# so e.g. `COMPOSE_FILE=deploy/docker-compose.production.yml ./… apply`
# works for the prod compose file):
#
#   ./001-add-failure-fields.sh check     # confirm container + show current schema
#   ./001-add-failure-fields.sh backup    # pg_dump just this table to ./
#   ./001-add-failure-fields.sh dry-run   # apply inside a tx + rollback
#   ./001-add-failure-fields.sh apply     # apply for real
#   ./001-add-failure-fields.sh verify    # show new schema + null counts
#   ./001-add-failure-fields.sh rollback  # drop the two columns
#
# Override the compose service name (defaults to `postgresql`) by
# exporting PG_SERVICE before running.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/001-add-failure-fields.sql"
PG_SERVICE="${PG_SERVICE:-postgresql}"

# Pick `docker compose` (v2) over `docker-compose` (v1) when both
# exist; v2 is the default everywhere modern. Fail loudly if neither
# is on PATH so the operator gets an actionable error rather than a
# confusing one further down.
if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    echo "error: neither 'docker compose' nor 'docker-compose' found on PATH" >&2
    exit 1
fi

# Wrap psql so $POSTGRES_USER / $POSTGRES_DB expand inside the
# container (the postgres image sets those from your .env). -T on
# exec disables TTY allocation so stdin redirection works.
psql_in_container() {
    "${COMPOSE[@]}" exec -T "$PG_SERVICE" \
        sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' "$@"
}

cmd_check() {
    echo "--- compose service status ---"
    "${COMPOSE[@]}" ps "$PG_SERVICE"
    echo
    echo "--- current sitespeed_io_test_runs schema ---"
    psql_in_container <<<'\d sitespeed_io_test_runs'
}

cmd_backup() {
    local out
    out="sitespeed_io_test_runs-backup-$(date +%Y%m%d-%H%M%S).sql"
    echo "Dumping table to $out ..."
    "${COMPOSE[@]}" exec -T "$PG_SERVICE" \
        sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t sitespeed_io_test_runs' \
        > "$out"
    echo "Done. Size: $(wc -c < "$out") bytes."
}

cmd_dry_run() {
    echo "Applying inside a transaction, then rolling back ..."
    {
        echo 'BEGIN;'
        cat "$SQL_FILE"
        echo '\d sitespeed_io_test_runs'
        echo 'ROLLBACK;'
    } | psql_in_container
    echo
    echo "Look for 'failed_reason | text' and 'finished_date | timestamp' in the schema printout above."
    echo "The trailing 'ROLLBACK' confirms nothing was committed."
}

cmd_apply() {
    echo "Applying $SQL_FILE for real ..."
    psql_in_container < "$SQL_FILE"
    echo "Apply finished."
}

cmd_verify() {
    echo "--- post-migration schema ---"
    psql_in_container <<<'\d sitespeed_io_test_runs'
    echo
    echo "--- null counts (both should be 0 until the new server is deployed) ---"
    psql_in_container <<<'SELECT count(*) AS total, count(failed_reason) AS with_reason, count(finished_date) AS with_finish FROM sitespeed_io_test_runs;'
}

cmd_rollback() {
    echo "Dropping failed_reason and finished_date ..."
    echo "WARNING: only safe if the new server has NOT been deployed yet."
    echo "Press Ctrl-C within 5 seconds to abort."
    sleep 5
    psql_in_container <<'SQL'
ALTER TABLE sitespeed_io_test_runs
    DROP COLUMN IF EXISTS failed_reason,
    DROP COLUMN IF EXISTS finished_date;
SQL
    echo "Rollback finished."
}

case "${1:-}" in
    check)    cmd_check ;;
    backup)   cmd_backup ;;
    dry-run)  cmd_dry_run ;;
    apply)    cmd_apply ;;
    verify)   cmd_verify ;;
    rollback) cmd_rollback ;;
    *)
        echo "usage: $0 {check|backup|dry-run|apply|verify|rollback}" >&2
        exit 2
        ;;
esac
