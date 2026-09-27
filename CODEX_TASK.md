# Current Codex Task

TASK_ID: `FOUNDATION-002`

PHASE: `PHASE_1_FOUNDATION`

OBJECTIVE:

> Make first-admin initialization atomic under concurrent requests and prove the behavior using only a disposable SQLite database.

CURRENT_STATE:

- CORRECTIVE EXECUTION: the first run ended without stdout/report. It partially modified `src/lib/auth.ts` and `src/app/api/auth/setup/route.ts`, created no required test file, and left `ANTIGRAVITY_REPORT.md` on FOUNDATION-004. The task is FAIL until corrected and verified.
- Review and preserve correct partial work. Current review concern: blanket mapping of Prisma `P2028` to setup conflict is too broad and can hide unrelated transaction failures; only demonstrated concurrency/unique/lock conflict cases may map to HTTP 409.
- SECOND REVIEW CORRECTION: concurrency tests/report now exist, but `handleSetup` returns the raw message of any unexpected `Error` whose name/message lacks `Prisma` or `sqlite`. This can leak internal details and incorrectly classify them as HTTP 400.
- `POST /api/auth/setup` calls `needsInitialSetup()`, then separately finds/updates or creates the first user, so concurrent requests can both pass eligibility before either writes.
- Existing intended behavior upgrades the oldest placeholder user when no bcrypt-backed user exists; otherwise it creates the first admin.
- The public route creates the session only after user mutation. User DB files must never be used by tests.
- Installed Prisma is 6.4.1. Prisma transaction guidance recommends short interactive transactions and Serializable isolation for strict consistency.

SCOPE:

- Modify only `src/lib/auth.ts`, `src/app/api/auth/setup/route.ts`, one new focused test file under `tests/`, and `ANTIGRAVITY_REPORT.md`.
- Extract a reusable atomic first-admin initialization function in `src/lib/auth.ts` or a narrowly named new auth helper file if separation is materially cleaner; if a new helper is used, it becomes the only additional allowed source file.
- Test against a uniquely named disposable SQLite DB under the OS temp directory, never root `dev.db` or `prisma/dev.db`.

REQUIRED_CHANGES:

- Correct the partial implementation, add the missing disposable-DB test suite, and complete the FOUNDATION-002 report. Do not start over or touch additional files.
- Catch malformed JSON and explicit name/phone/password validation as safe HTTP 400 responses. Treat every other unexpected error, regardless of its name/message, as HTTP 500 with only the generic setup-failure message. Add a regression test using a sensitive arbitrary error string and assert status/body do not leak it.
- Read installed Next.js Route Handler docs and Prisma transaction guidance before editing.
- Hash/validate name, normalized phone, and password outside the transaction; keep the DB transaction short.
- Within a Serializable interactive transaction, re-check that no bcrypt-backed user exists, then update the oldest placeholder user or create the first ADMIN exactly as current behavior intends.
- Return a typed conflict result/error when setup is already complete or loses a concurrent race; route must map it to HTTP 409 without exposing internal DB errors.
- Call `createSession` only after a successful committed initialization.
- Add deterministic tests for empty DB success, placeholder upgrade, later conflict, and two concurrent attempts yielding exactly one success and one conflict/failure without multiple initialized admins.
- Tests must create schema only in the disposable temp DB, disconnect clients, and remove only their exact temp artifacts.

FILES_EXPECTED_TO_CHANGE:

- `src/lib/auth.ts`
- `src/app/api/auth/setup/route.ts`
- `tests/initial-setup.test.ts`
- `ANTIGRAVITY_REPORT.md`
- Optional only if needed instead of placing service in auth.ts: `src/lib/initial-setup.ts`

DO_NOT_TOUCH:

- Do not modify Prisma schema/migrations, package files, environment files, either user SQLite DB, other routes/UI, or workflow files besides report.
- Do not run migrations, db push/pull against project config, seed, Prisma Studio, or any command that opens user DBs.
- Do not add dependencies, commit, push, deploy, reset, revert, delete user files, or expand scope.
- Do not implement throttling; that is FOUNDATION-002B.

TEST_REQUIRED:

- Pre/post DB integrity evidence for both user DBs (hash where readable, otherwise unchanged size/timestamp).
- `npm test`
- Run the new test repeatedly enough to exercise concurrency deterministically.
- `npx tsc --noEmit`
- Scoped ESLint on changed source/tests.
- `npm run build`
- `git diff --check` on changed source/tests.

ACCEPTANCE_CRITERIA:

- Exactly one of two concurrent setup attempts can initialize an admin; the other is a defined conflict/failure and there is exactly one bcrypt-backed ADMIN afterward.
- Empty and placeholder bootstrap behaviors are preserved; any later setup receives HTTP 409.
- Session creation occurs only after committed setup.
- Tests and all temp schema/data live outside the workspace and never touch user DBs.
- Tests, repeated concurrency test, TypeScript, scoped lint, build, and diff-check pass.
- Only expected source/test/report files change and both user DBs remain unchanged.

REQUIRED_REPORT:

- Overwrite `ANTIGRAVITY_REPORT.md` with TASK_ID, STATUS, FILES_CHANGED, IMPLEMENTATION_SUMMARY, TESTS_RUN, TEST_RESULTS, ISSUES, RISKS, and BLOCKERS.
- Report transaction isolation/options, conflict mapping, concurrency evidence, exact temp location pattern (no secret values), cleanup result, and DB integrity evidence.
- Return a short factual stdout summary.
