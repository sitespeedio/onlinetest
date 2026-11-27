-- Adds the from_api column to sitespeed_io_test_runs.
--
-- Apply with (see README.md in this directory for details):
--
--   docker compose exec -T postgresql \
--     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
--     < server/database/migrations/002-add-from-api.sql
--
-- Apply it before you deploy the new server: the new server writes the
-- column for each new test. The column is nullable with no default, so
-- Postgres 11+ applies the ALTER as a metadata-only change (no table
-- rewrite). The previous server continues to work, because every other
-- SQL statement names its columns explicitly.
--
-- from_api: true when the test came through the API. The web GUI cannot
-- re-run these tests or change their label, so a user cannot reuse the
-- configuration of your own tests without the limits of the web GUI.
-- Existing rows stay NULL and count as web GUI tests.

ALTER TABLE sitespeed_io_test_runs
    ADD COLUMN from_api BOOLEAN;
