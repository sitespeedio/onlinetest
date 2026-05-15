# Database migrations

`setup/setup.sql` only runs on a fresh Postgres data dir
(`docker-entrypoint-initdb.d`). For databases that already exist, apply
the SQL files in this directory in numeric order, once per environment.

Each migration is designed to be:

- **Forward-compatible** — the previous release of the server can still
  run against the migrated schema. Migrate first, deploy after.
- **Online** — `ADD COLUMN` is nullable with no default so Postgres 11+
  applies it as a metadata-only change (no table rewrite, only a brief
  metadata lock). Safe to run on a live database.

## Easiest path: the helper script

Each migration ships with a sibling `.sh` wrapper that runs against
the Postgres container in your compose stack. Run it from the
directory you normally use to invoke `docker compose`:

```sh
./server/database/migrations/001-add-failure-fields.sh check     # confirm container + show current schema
./server/database/migrations/001-add-failure-fields.sh backup    # pg_dump just this table to ./
./server/database/migrations/001-add-failure-fields.sh dry-run   # apply inside a tx + rollback
./server/database/migrations/001-add-failure-fields.sh apply     # apply for real
./server/database/migrations/001-add-failure-fields.sh verify    # show new schema + null counts
./server/database/migrations/001-add-failure-fields.sh rollback  # drop the two columns
```

If your prod stack is launched from `deploy/docker-compose.production.yml`,
either run the script from `deploy/` or export `COMPOSE_FILE` first:

```sh
COMPOSE_FILE=deploy/docker-compose.production.yml \
    ./server/database/migrations/001-add-failure-fields.sh apply
```

Override the compose service name with `PG_SERVICE=...` if it isn't `postgresql`.

## Applying a migration manually with the production Docker stack

The Postgres container in `docker-compose.dependencies.yml` /
`deploy/docker-compose.production.yml` is named `postgresql`. The
official `postgres` image sets `POSTGRES_USER` and `POSTGRES_DB`
inside the container from the values you wired up in your `.env`
(`POSTGRESQL_USER`, `POSTGRESQL_DB`), so the simplest reliable form
is to let `psql` read those env vars from inside the container rather
than from your host shell:

```sh
docker compose exec -T postgresql \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < server/database/migrations/001-add-failure-fields.sql
```

(Substitute `docker-compose` for `docker compose` on older installs;
add `-f deploy/docker-compose.production.yml` if you run the prod
compose file directly. `-T` disables the TTY allocation so the file
on stdin is delivered verbatim.)

To rehearse the change without committing it, wrap the SQL in a
transaction and roll back at the end:

```sh
( echo 'BEGIN;'; \
  cat server/database/migrations/001-add-failure-fields.sql; \
  echo 'ROLLBACK;' ) | \
docker compose exec -T postgresql \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Verifying

```sh
docker compose exec postgresql \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d sitespeed_io_test_runs"'
```

The new columns should appear at the bottom of the column list.
