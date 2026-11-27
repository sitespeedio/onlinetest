-- Adds from_api, makes the dates time zone aware, saves connectivity and
-- adds an index on added_date.
--
-- Apply with (see README.md in this directory for details):
--
--   docker compose exec -T postgresql \
--     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
--     < server/database/migrations/002-api-tests-and-dates.sql
--
-- Apply it before you deploy the new server. The new server writes
-- from_api and connectivity, and it does not start until the migration
-- is applied. The previous server continues to work on the migrated
-- schema, because every other SQL statement names its columns.
--
-- from_api: true when the test came through the API. The web GUI cannot
-- re-run these tests or change their label, so a user cannot reuse the
-- configuration of your own tests without the limits of the web GUI.
-- Nullable with no default, so existing rows stay NULL and count as web
-- GUI tests. Metadata-only change.
--
-- added_date, run_date, finished_date: TIMESTAMP stored the wall-clock
-- time of whichever machine wrote the value (the server, the database or
-- the testrunner), so the dates moved when a machine did not use UTC.
-- TIMESTAMPTZ stores the real time. Existing values are read as UTC (the
-- SET below). That is correct for the Docker setup. If your server ran in
-- another time zone, existing rows move by that offset, one time. With
-- the session in UTC, Postgres 12+ does not rewrite the table, it only
-- rebuilds run_date_index.
--
-- connectivity: the server now saves it. TEXT, because VARCHAR(12) would
-- make a test with a longer connectivity name fail to save.
-- Metadata-only change.
--
-- added_date_index: the latest tests page, search and the admin
-- statistics sort or filter on added_date. CREATE INDEX blocks writes
-- while it builds, which is short for a table of this size.

SET timezone = 'UTC';

ALTER TABLE sitespeed_io_test_runs
    ADD COLUMN from_api BOOLEAN,
    ALTER COLUMN added_date TYPE TIMESTAMPTZ,
    ALTER COLUMN run_date TYPE TIMESTAMPTZ,
    ALTER COLUMN finished_date TYPE TIMESTAMPTZ,
    ALTER COLUMN connectivity TYPE TEXT;

CREATE INDEX IF NOT EXISTS added_date_index ON sitespeed_io_test_runs (added_date);
