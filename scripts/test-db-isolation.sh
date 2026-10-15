#!/usr/bin/env bash
set -euo pipefail

# A disposable local PostgreSQL cluster only. Never reads a hosted database URL.
root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d /tmp/pontual-db-test.XXXXXX)"
runner=()
if [ "$(id -u)" = 0 ]; then
  local_user="$(awk -F: '$3 > 0 {print $1; exit}' /etc/passwd)"
  if [ -z "$local_user" ]; then echo 'A non-root local account is required' >&2; exit 1; fi
  chown "$local_user" "$work"
  runner=(runuser -u "$local_user" --)
fi
cleanup() {
  "${runner[@]}" pg_ctl -D "$work/data" -m immediate stop > /dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
for binary in initdb pg_ctl psql; do
  command -v "$binary" > /dev/null || { echo "Required local PostgreSQL binary missing: $binary" >&2; exit 1; }
done
"${runner[@]}" initdb -D "$work/data" -U postgres --auth=trust > "$work/init.log" 2>&1 || { cat "$work/init.log" >&2; exit 1; }
"${runner[@]}" pg_ctl -D "$work/data" -l "$work/server.log" \
  -o "-k $work -p 55439 -c listen_addresses=''" -w start > /dev/null
export PGHOST="$work" PGPORT=55439 PGUSER=postgres PGDATABASE=postgres
unset PGSERVICE PGSERVICEFILE PGOPTIONS PGPASSWORD
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
-- Minimal auth contract for this disposable cluster, not the hosted auth schema.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
SQL
for migration in "$root"/drizzle/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  psql -X -v ON_ERROR_STOP=1 -q -f "$migration" > "$work/migration.log" 2>&1 || { cat "$work/migration.log"; exit 1; }
  if [[ "$migration" == *0000_pontual_estrutura.sql ]]; then
    psql -X -v ON_ERROR_STOP=1 -q -c "INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000000099','legacy@example.invalid');" > /dev/null
  fi
done
psql -X -v ON_ERROR_STOP=1 -q -f "$root/tests/database/school-isolation.sql"
echo 'PASS: school isolation, authorized writes, role restrictions, audit and rollback'