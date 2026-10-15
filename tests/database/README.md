# School isolation regression test

Run `bunx vitest run src/test/database-isolation.test.ts` (or `bun run test`
for the complete suite). PostgreSQL binaries `initdb`, `pg_ctl` and `psql`
must be on PATH. On root-run Linux environments, `setpriv` and a non-root
local account are also required. Missing requirements fail the test, not skip it.

The runner creates a disposable PostgreSQL cluster under `/tmp` using only a
private Unix socket. It never reads a hosted connection string. It replays all
committed migrations against a minimal local auth contract (`auth.users` and
JWT-derived `auth.uid()`), then tests the actual policies, grants, triggers and
SECURITY DEFINER functions. This is a database authorization test, not a test of
hosted login, JWT signature verification, or the Data API.

Coverage:
- Both schools' administrators read, create and update their own students,
  register/correct/cancel their own occurrences and update their own settings.
- Updated values read back, including occurrence author and audit records.
- Unfiltered reads and guessed IDs cannot reveal the other school's records.
- Foreign updates affect zero rows; cross-school RPCs, inserts, class references
  and attempts to change school identity are rejected with expected errors.
- Privileged assertions verify the other school's values remain unchanged.
- Staff can register but not edit students/settings or correct occurrences;
  coordination can correct only its school's occurrences; students see only
  their own history; pending members and anonymous callers cannot access data.
- Synthetic fixtures are rolled back and their absence is checked. The cluster
  is stopped and removed on success or failure.

No production accounts, passwords, student records or permissions are changed
by running the test. The local auth contract is created only in the disposable
cluster; it must never be applied to Lovable Cloud.