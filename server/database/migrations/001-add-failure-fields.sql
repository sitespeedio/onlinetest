-- Adds two columns to sitespeed_io_test_runs.
--
-- Apply with (see README.md in this directory for details):
--
--   docker compose exec -T postgresql \
--     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
--     < server/database/migrations/001-add-failure-fields.sql
--
-- The sh -c wrapper is so $POSTGRES_USER / $POSTGRES_DB expand inside
-- the container (where the postgres image sets them) rather than from
-- the operator's host shell.
--
-- Safe to run on a live DB before deploying the new server: both
-- columns are nullable with no default, so Postgres 11+ applies the
-- ALTER as a metadata-only change (no table rewrite). Existing reads
-- and writes continue to work because every other SQL statement names
-- its columns explicitly.
--
-- failed_reason: free-text error captured when a test ends in status
-- 'failed'. Sources: Bull's global:failed event (the testrunner threw),
-- queue-down submit path in add-test.js, and (future) the result-queue
-- path when sitespeed.io itself reports a non-zero exit.
--
-- finished_date: wall-clock timestamp of the terminal status transition
-- (completed or failed). Lets us measure end-to-end test duration as
-- finished_date - added_date and pure-run duration as
-- finished_date - run_date. Distinct from run_date, which is the
-- browsertime start timestamp reported by the testrunner.
--
-- Both columns are nullable so existing rows stay valid without backfill.

ALTER TABLE sitespeed_io_test_runs
    ADD COLUMN failed_reason TEXT,
    ADD COLUMN finished_date TIMESTAMP;
