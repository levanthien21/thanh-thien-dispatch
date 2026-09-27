# Project Roadmap

## Governance

- Codex owns architecture, planning, task creation, review, verification, and PASS/FAIL decisions.
- Antigravity implements one current task at a time from `CODEX_TASK.md`.
- A task advances only after Codex independently verifies its acceptance criteria.
- Product work is added here only in response to a user requirement; no product roadmap is inferred during workflow setup.

## Status Legend

- `PLANNED`: defined but not started.
- `IN_PROGRESS`: handed to Antigravity and awaiting verified completion.
- `PASS`: independently verified by Codex with recorded evidence.
- `FAIL`: verification failed; a corrective task is required.
- `BLOCKED`: a genuine blocker requires user input or external resolution.

## Phase 0 — Workflow Setup

Status: `PASS`

Objective: Establish the durable Codex–Antigravity orchestration files without implementing product functionality or invoking Antigravity for development.

### SETUP-001 — Create workflow control files

Status: `PASS`

Scope:

- Preserve the generated Next.js instruction block in `AGENTS.md` and add durable orchestration rules.
- Create templates for the current task and latest Antigravity report.
- Create the project roadmap and status model.
- Do not implement product functionality and do not call Antigravity.

Acceptance criteria:

- `AGENTS.md`, `CODEX_TASK.md`, `ANTIGRAVITY_REPORT.md`, and `PROJECT_ROADMAP.md` exist at the repository root.
- `AGENTS.md` defines roles, mandatory workflow, handoff/report contracts, verification gate, escalation rule, and safety constraints.
- The task and report templates contain every required field.
- This roadmap tracks task state and verification evidence.
- No product source is changed by SETUP-001.
- Antigravity is not called for SETUP-001.

Evidence:

- Codex verified all four root workflow files exist.
- Codex verified all 11 required task fields and all 9 required report fields are present.
- Codex inspected `git status` and the workflow-file diff; SETUP-001 changed only the four authorized workflow files.
- The generated Next.js instruction block remains present in `AGENTS.md`.
- `CODEX_TASK.md` remains unassigned and `ANTIGRAVITY_REPORT.md` remains `NOT_RUN`; Antigravity was not called.
- No product test/build was required because SETUP-001 contains documentation/templates only.

## Product Phases

The development roadmap is defined below from the Phase 1 source audit. Tasks advance one at a time through the Codex verification gate.

## PHASE_0_VALIDATION — Orchestration Validation

Status: `PASS`

Objective: Validate the complete Codex → Antigravity → Codex control loop without changing product source or data.

### ORCHESTRATION-TEST-001 — Read-only implementation-agent dry run

Status: `PASS`

Execution notes:

- Codex created the single scoped task and captured `git status`, `git diff --stat`, the workflow-file inventory, and workflow-file SHA-256 hashes before execution.
- The first Antigravity attempt was auto-denied by its internal headless `command` permission gate and made no workspace change.
- Codex recorded the failure cause as a corrective execution note and retried the same task with Antigravity tool prompts pre-approved; the task scope remained read-only except for `ANTIGRAVITY_REPORT.md`.
- Antigravity stdout reported `ORCHESTRATION-TEST-001` as `PASS` and identified `ANTIGRAVITY_REPORT.md` as its only changed file.

Verification evidence:

- Codex read `ANTIGRAVITY_REPORT.md` and confirmed the required report fields and matching task ID.
- Codex inspected `package.json`, `prisma/schema.prisma`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/proxy.ts`, and `src/app/login/page.tsx`; the reported stack, npm package manager, and principal entry points match repository evidence.
- Pre/post `git status` outputs match, and pre/post tracked `git diff --stat` remains 10 files with 2,595 insertions and 281 deletions; these are pre-existing/user and workflow setup changes.
- Workflow hashes show `AGENTS.md` and `PROJECT_ROADMAP.md` unchanged during Antigravity execution, `CODEX_TASK.md` unchanged from the corrective baseline, and only `ANTIGRAVITY_REPORT.md` changed by Antigravity.
- Codex independently scanned the test definitions for common write/destructive operations and found none.
- Codex independently ran `npm test`: 15 tests passed, 0 failed, 0 skipped.
- No migration, package installation, dependency update, commit, push, reset, revert, deletion, or product-source edit was performed by this validation task.

Decision: `TASK=PASS`

## Roadmap Notes

- Existing user work in the repository must be preserved and treated as the baseline unless a future task explicitly includes it.

## Phase 1 Audit — 2026-09-08

### Verified current state

- Structure: single Next.js application with 84 TypeScript/TSX files across `src`, `prisma`, and `tests`; 20 App Router pages, 35 route-handler files, 4 test files, and 6 migration directories.
- Stack: Next.js 16.3.1 App Router/Proxy, React 19.2.8, TypeScript 5, Node.js, npm, Prisma ORM/Client 6.4.1, SQLite, CSS Modules, Framer Motion, Lucide, Recharts, React Hot Toast, and next-themes.
- Frontend: dashboard, booking/seat selection, trip list and manifest, booking edit/transfer, search, CRM view, drivers, vehicles, parcels, reports, notifications, profile, login, and admin settings pages.
- Backend: Next.js route handlers implement booking, trip generation/assignment, reconciliation, customer queries, fleet, parcels, reports, search, notifications, users, pricing, schedules, SMS templates/logs, profile password changes, authentication, and map autocomplete.
- Database: Prisma schema has 18 models covering users/sessions, operations, bookings/seats/payments, call/transcript/AI extraction, audit, parcels, SMS, and pricing. The active development URL resolves to `prisma/dev.db`; a second root `dev.db` also exists. Both database files and the full Prisma tree are currently untracked.
- Authentication: 12-hour random opaque session token in an `httpOnly`, `sameSite=lax` cookie; SHA-256 token hashes stored in SQLite; bcrypt cost 12; roles are AGENT, DISPATCHER, and ADMIN; Proxy applies path authorization and many sensitive handlers also call `requireUser`.
- External services: eSMS customer-care endpoint is implemented with sandbox support and a 10-second timeout. SerpAPI Google Maps search is implemented, but missing credentials produce demonstrative mock addresses. No real telephony, speech-to-text, LLM extraction, or Zalo ZNS integration exists.
- Configuration: `.env` is ignored and `.env.example` documents DATABASE_URL, SERPAPI_KEY, and eSMS variables. No secret values were read into the audit report.
- Entry points: `src/app/layout.tsx`, `src/app/page.tsx`, `src/proxy.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`, and the route handlers under `src/app/api`.
- Tests: 4 files cover access helpers, business rules, payments, and eSMS behavior. Codex ran 15 tests: 15 passed, 0 failed.
- Static checks: `npx tsc --noEmit` passed; `npx prisma validate` passed. ESLint completed with 222 warnings, dominated by explicit `any`, unused values, hook dependency/state-in-effect findings, and unoptimized image usage.
- Build: sandboxed build first failed with `EPERM` opening `.next/trace-build`; the same production build outside sandbox compiled, type-checked, generated all 46 routes/pages, and passed.
- Existing features are broad but uneven: operational booking/fleet/parcels/admin functionality is real; calls are a hard-coded simulator, customer management is read-only, maps has fake fallback data, and the settings label mentions Zalo without an implementation.

### Major risks and technical debt

- Nearly all new backend, Prisma, test, and feature files are untracked, while core files and dependencies are modified. Any broad cleanup, reset, or refactor could destroy substantial user work.
- Only 15 unit tests cover a system with 35 API route files and multiple transactional/data-integrity paths; authentication, authorization at route boundaries, booking concurrency, setup races, reports, notifications, and most CRUD flows lack integration coverage.
- Login and initial setup have no rate limiting. Initial setup performs the eligibility check and user mutation separately, leaving a concurrency/race risk.
- Several read handlers rely only on global Proxy protection instead of an explicit handler guard. This is functional in the current build but weakens defense in depth and makes isolated handler testing risky.
- `prisma` and `@prisma/client` are 6.4.1 while unused SQL adapter packages are 7.9.1, creating dependency ambiguity despite the current build passing.
- Two SQLite files exist (`dev.db` and `prisma/dev.db`); accidental use or packaging of the wrong data file is plausible.
- Prisma query logging is always enabled in `src/lib/prisma.ts`, which can leak operational details and add production noise.
- Error handling and validation are inconsistent, with numerous `any` types and some handlers returning raw/internal error messages.
- Maps silently returns fake addresses without a key, which can put fabricated pickup/drop-off data into real workflows.
- Core UI components are large and weakly typed; lint has 222 warnings, including React hook findings that may cause extra renders or stale state.
- CallRecord/Transcript/AIExtraction models are not connected to a real call workflow. Zalo ZNS and production deployment/runtime configuration are absent.

### Protected baseline

- Preserve all modified and untracked user files reported by `git status`, especially `package.json`, `package-lock.json`, `README.md`, `src/app/*`, all of `src/app/api`, `src/lib`, `src/components`, `prisma`, `tests`, `.env.example`, both SQLite files, and seed scripts.
- Never reset, revert, clean, delete, migrate destructively, or overwrite these files outside the exact current task scope.
- Before and after each task, compare `git status`, `git diff`, expected file hashes/diffs where practical, and database timestamps when the task must not alter data.

## Development Roadmap

### PHASE_1_FOUNDATION — Establish safety and executable specifications

#### FOUNDATION-001 — Centralize and test authentication boundary policy

- OBJECTIVE: Extract a pure, shared route-access policy used by Proxy and add focused tests proving public/protected classification and role boundaries without mutating the development database.
- DEPENDENCIES: Phase 1 audit.
- SCOPE: `src/lib/access.ts`, `src/proxy.ts`, and `tests/access.test.ts` only; preserve current observable authorization behavior.
- RISK: Medium; Next.js request/cookie mocking can become brittle.
- ACCEPTANCE_CRITERIA: Proxy consumes the shared pure policy; tests cover public auth routes, protected pages/APIs, role denial, and allowed roles; no database is accessed; existing tests, lint, typecheck, and build remain green.
- STATUS: PASS
- EVIDENCE: Antigravity centralized `PUBLIC_PATHS`, `isPublicPath`, and `isProtectedPath`, updated Proxy consumption, and added four focused tests. Codex independently reviewed all scoped source, confirmed only expected files changed and both database timestamps stayed unchanged, then passed 19/19 tests, TypeScript, scoped ESLint, diff-check, and a 46-route production build.

#### FOUNDATION-002 — Make initial admin setup atomic

- OBJECTIVE: Make first-admin initialization atomic under concurrent requests and prove it with an isolated disposable SQLite test.
- DEPENDENCIES: FOUNDATION-001.
- SCOPE: Initial-setup service/route and focused isolated tests; no changes to the user databases.
- RISK: High; incorrect transaction semantics can permit takeover or block legitimate initialization.
- ACCEPTANCE_CRITERIA: Exactly one concurrent setup succeeds, later attempts receive conflict, existing intended bootstrap behavior remains documented, and tests use only disposable DB files.
- STATUS: IN_PROGRESS

#### FOUNDATION-002B — Bound login and setup authentication attempts

- OBJECTIVE: Add a bounded, memory-safe throttling strategy for login and initial setup suitable for the current single-node deployment.
- DEPENDENCIES: FOUNDATION-002.
- SCOPE: Pure rate-limit utility, login/setup routes, and deterministic tests; no external service or schema change.
- RISK: High; weak keys allow bypass while aggressive limits can lock out operators.
- ACCEPTANCE_CRITERIA: Repeated failures are bounded with retry metadata, successful access clears appropriate state, memory is capped/expired, proxy-header assumptions are documented, and deterministic tests pass.
- STATUS: PLANNED

#### FOUNDATION-003 — Normalize Prisma dependency/runtime configuration

- OBJECTIVE: Remove or align unused incompatible Prisma adapter packages and disable verbose query logging in production.
- DEPENDENCIES: FOUNDATION-001.
- SCOPE: Dependency manifest/lockfile and Prisma client bootstrap only; no schema or migration.
- RISK: Medium; dependency changes affect install reproducibility.
- ACCEPTANCE_CRITERIA: One coherent Prisma major version, no unused adapter ambiguity, production query logging disabled, generate/validate/typecheck/build/tests pass.
- STATUS: PASS
- EVIDENCE: Initial Antigravity execution timed out after completing partial changes; Codex verified the partial state and issued a corrective retry without reverting it. Final implementation removed only the two unused Prisma 7 adapters, retained Prisma/Client 6.4.1 and all other direct dependencies, and disabled query logging only in production. Codex independently passed dependency-tree/reference checks, Prisma validate, 19/19 tests, TypeScript, scoped ESLint, diff-check, and a 46-route production build; root DB hash and active DB size/timestamp were unchanged.

#### FOUNDATION-004 — Clarify SQLite data-file ownership

- OBJECTIVE: Establish one documented development database path and safeguards against committing or accidentally using local database artifacts.
- DEPENDENCIES: FOUNDATION-003.
- SCOPE: Ignore rules, example config, startup/documentation checks; no database deletion or migration.
- RISK: Medium due to two existing user databases that must remain untouched.
- ACCEPTANCE_CRITERIA: Both existing DB files remain byte-for-byte intact, active path is unambiguous, local DB artifacts are ignored, and setup documentation agrees with Prisma resolution.
- STATUS: PASS
- EVIDENCE: Added explicit ignore rules for both local DB paths and SQLite sidecars, clarified unchanged relative URL resolution and disposable-test policy, and preserved both DB files. Codex independently confirmed ignore matches, exact example URL, root DB SHA-256, active DB size/timestamp, 19/19 tests, TypeScript, Prisma validate, and scoped diff-check.

### PHASE_2_CORE_RELIABILITY — Protect transactional operations

#### CORE-001 — Add booking creation integration coverage

- OBJECTIVE: Verify validation, seat uniqueness, round-trip atomicity, pricing/payment rules, and audit/SMS outcomes.
- DEPENDENCIES: FOUNDATION-002, FOUNDATION-004.
- SCOPE: Isolated test database and booking API/service boundaries.
- RISK: High; core revenue and seat inventory path.
- ACCEPTANCE_CRITERIA: Deterministic isolated tests cover success and rollback/conflict paths without touching either user DB.
- STATUS: PLANNED

#### CORE-002 — Add booking edit/cancel/transfer coverage

- OBJECTIVE: Protect seat release/reassignment, change history, cancellation, and departure cutoffs.
- DEPENDENCIES: CORE-001.
- SCOPE: Booking mutation routes and transactional tests.
- RISK: High; incorrect changes can double-book or lose history.
- ACCEPTANCE_CRITERIA: Tests prove atomic seat ownership and history/audit behavior across edit, cancel, and transfer paths.
- STATUS: PLANNED

#### CORE-003 — Add trip generation and vehicle assignment coverage

- OBJECTIVE: Verify schedule-driven trip creation, vehicle conflicts, fixed/flexible assignments, and idempotency.
- DEPENDENCIES: FOUNDATION-004.
- SCOPE: Trip/schedule assignment logic and isolated tests.
- RISK: High; affects fleet availability.
- ACCEPTANCE_CRITERIA: Repeated generation is idempotent and no active vehicle is assigned to conflicting trips.
- STATUS: PLANNED

#### CORE-004 — Harden reconciliation and financial reporting invariants

- OBJECTIVE: Verify cash reconciliation, payment status, revenue aggregation, and audit evidence.
- DEPENDENCIES: CORE-001, CORE-002.
- SCOPE: Reconciliation/report calculations and tests.
- RISK: High; financial correctness.
- ACCEPTANCE_CRITERIA: Deterministic fixtures produce correct totals, invalid transitions fail, and reconciliation is auditable/idempotent.
- STATUS: PLANNED

### PHASE_3_API_SECURITY — Consistent contracts and authorization

#### APISEC-001 — Add explicit guards to protected read handlers

- OBJECTIVE: Ensure sensitive API handlers enforce authentication/roles locally in addition to Proxy rules.
- DEPENDENCIES: FOUNDATION-001.
- SCOPE: Customer, report, search, route, parcel-trip, SMS-log, effective-price, and map handlers as appropriate.
- RISK: Medium; role choice can disrupt current workflows.
- ACCEPTANCE_CRITERIA: Every non-public handler has an explicit documented guard and boundary tests pass.
- STATUS: PLANNED

#### APISEC-002 — Standardize validation and safe error responses

- OBJECTIVE: Prevent internal error leakage and unify bounded input validation/status codes.
- DEPENDENCIES: APISEC-001, CORE-001.
- SCOPE: Shared API error/validation utilities followed by small route groups.
- RISK: Medium; client error handling may depend on existing messages.
- ACCEPTANCE_CRITERIA: Unknown errors return safe messages, auth errors map consistently, inputs are bounded, and client-facing expected errors remain actionable.
- STATUS: PLANNED

#### APISEC-003 — Add security headers and production cookie checks

- OBJECTIVE: Establish CSP-compatible baseline headers and verify secure session-cookie behavior for deployment.
- DEPENDENCIES: FOUNDATION-002.
- SCOPE: Next.js config/proxy/auth configuration and tests.
- RISK: Medium; strict headers can break UI or external services.
- ACCEPTANCE_CRITERIA: Build responses carry agreed headers, production cookies are secure/httpOnly/sameSite, and required app assets/integrations still work.
- STATUS: PLANNED

### PHASE_4_FEATURE_COMPLETION — Complete existing operational modules

#### FEATURE-001 — Replace fake map fallback with explicit unavailable state

- OBJECTIVE: Prevent fabricated addresses from being treated as real operational data.
- DEPENDENCIES: APISEC-002.
- SCOPE: Map API and booking address-autocomplete UX.
- RISK: Medium; operators need a usable fallback when SerpAPI is unavailable.
- ACCEPTANCE_CRITERIA: No mock address is returned outside tests, missing/failing configuration is explicit, manual address entry remains usable, and tests cover both modes.
- STATUS: PLANNED

#### FEATURE-002 — Complete customer management workflow

- OBJECTIVE: Add controlled customer detail/update capabilities beyond the current read-only CRM view.
- DEPENDENCIES: APISEC-002, CORE-002.
- SCOPE: Customer API/UI with validation, authorization, and audit trail; no customer deletion.
- RISK: Medium; phone identity changes affect booking linkage.
- ACCEPTANCE_CRITERIA: Authorized edits are validated/audited, duplicates are rejected, history remains linked, and tests pass.
- STATUS: PLANNED

#### FEATURE-003 — Make operational notifications lifecycle-complete

- OBJECTIVE: Verify deduplication, resolution, read/read-all, role targeting, and bounded retention behavior.
- DEPENDENCIES: APISEC-001, CORE-004.
- SCOPE: Notification service/routes/UI and tests.
- RISK: Medium; noisy or stale alerts reduce operator trust.
- ACCEPTANCE_CRITERIA: Alerts deduplicate and resolve correctly, users cannot mutate others' notifications, and UI counts stay consistent.
- STATUS: PLANNED

#### FEATURE-004 — Define and implement real call-assistant ingestion boundary

- OBJECTIVE: Replace the hard-coded call simulator with a provider-neutral, auditable call/transcript/extraction workflow while retaining a safe demo mode.
- DEPENDENCIES: APISEC-002, FEATURE-002.
- SCOPE: CallRecord/Transcript/AIExtraction APIs and UI boundary; provider connection remains a later integration task.
- RISK: High; personal data, transcript privacy, and AI uncertainty.
- ACCEPTANCE_CRITERIA: Real persisted call sessions and operator-confirmed extraction exist, demo data is clearly labeled, and no booking is created without confirmation.
- STATUS: PLANNED

### PHASE_5_INTEGRATIONS — External provider reliability

#### INTEGRATION-001 — Harden eSMS delivery lifecycle

- OBJECTIVE: Add idempotency, redacted structured failures, retry policy, and delivery-state observability.
- DEPENDENCIES: CORE-001, APISEC-002.
- SCOPE: eSMS service, SMS logs, booking notification boundary, and tests; sandbox remains default.
- RISK: High; duplicate sends can cost money and disturb customers.
- ACCEPTANCE_CRITERIA: Retries cannot duplicate accepted messages, credentials never leak, failures are actionable, and sandbox tests make no real paid send.
- STATUS: PLANNED

#### INTEGRATION-002 — Decide and implement Zalo ZNS scope

- OBJECTIVE: Either implement an approved ZNS provider flow or remove/label unsupported ZNS claims throughout the UI/docs.
- DEPENDENCIES: INTEGRATION-001; user/provider credentials and template decision.
- SCOPE: Messaging settings/provider abstraction and documentation.
- RISK: High; external approval, cost, credentials, and template compliance.
- ACCEPTANCE_CRITERIA: UI accurately reflects supported channels; if enabled, sandbox/approved-template tests and failure logging pass.
- STATUS: BLOCKED_PENDING_PROVIDER_DECISION

#### INTEGRATION-003 — Connect telephony/transcription provider

- OBJECTIVE: Connect an explicitly selected provider to the call-assistant ingestion boundary.
- DEPENDENCIES: FEATURE-004; user selection of provider, privacy/retention policy, credentials, and webhook exposure.
- SCOPE: Provider adapter, authenticated webhooks, transcription ingestion, observability, and replay protection.
- RISK: High; PII, recording consent, network exposure, and variable cost.
- ACCEPTANCE_CRITERIA: Signed/replay-safe webhooks, documented consent/retention, operator-visible failures, and end-to-end sandbox validation.
- STATUS: BLOCKED_PENDING_PROVIDER_DECISION

### PHASE_6_QUALITY_UX — Maintainability and operator experience

#### QUALITY-001 — Reduce lint debt by module

- OBJECTIVE: Remove hook correctness warnings and replace high-risk `any` types without broad refactoring.
- DEPENDENCIES: Core/API behavior tests for each touched module.
- SCOPE: Small module batches, starting with booking/trips/dashboard; no visual redesign.
- RISK: Medium; type cleanup can expose hidden contract mismatches.
- ACCEPTANCE_CRITERIA: Each batch has zero hook correctness warnings, materially fewer `any` warnings, and unchanged verified behavior.
- STATUS: PLANNED

#### UX-001 — Standardize loading, empty, and error states

- OBJECTIVE: Make operator feedback consistent across primary operational pages.
- DEPENDENCIES: APISEC-002, FEATURE-001 through FEATURE-003.
- SCOPE: Shared UI patterns and incremental page adoption.
- RISK: Low.
- ACCEPTANCE_CRITERIA: Booking, trips, customers, parcels, reports, and settings expose accessible loading/error/empty states without hiding server failures.
- STATUS: PLANNED

#### UX-002 — Accessibility and responsive workflow audit

- OBJECTIVE: Verify keyboard navigation, labels, focus, contrast, modal behavior, and narrow-screen operation for core workflows.
- DEPENDENCIES: UX-001.
- SCOPE: Core booking/trip/search/admin workflows.
- RISK: Medium; CSS changes can regress dense dispatch layouts.
- ACCEPTANCE_CRITERIA: Documented keyboard/mobile checks pass and automated accessibility issues in selected flows are resolved.
- STATUS: PLANNED

### PHASE_7_HARDENING — System-level validation

#### HARDEN-001 — Full API and concurrency regression suite

- OBJECTIVE: Run isolated end-to-end API tests across auth, booking, fleet, parcels, notifications, reports, and admin settings.
- DEPENDENCIES: PHASE_2 through PHASE_5 completed or explicitly deferred.
- SCOPE: Automated isolated environment; never user databases.
- RISK: Medium.
- ACCEPTANCE_CRITERIA: Critical happy/error/concurrency paths pass repeatedly with deterministic fixtures.
- STATUS: PLANNED

#### HARDEN-002 — Backup, restore, retention, and audit runbook

- OBJECTIVE: Define and test recoverable SQLite backup/restore and sensitive-data retention procedures.
- DEPENDENCIES: FOUNDATION-004, FEATURE-004.
- SCOPE: Scripts/docs and disposable test data only.
- RISK: High if tested against user data; disposable copies are mandatory.
- ACCEPTANCE_CRITERIA: Restore drill passes on a disposable copy, retention covers sessions/transcripts/logs, and no user DB is modified.
- STATUS: PLANNED

### PHASE_8_DEPLOYMENT_READINESS — Reproducible release preparation

#### DEPLOY-001 — Define supported deployment architecture

- OBJECTIVE: Document the single-node/persistent-volume constraints of SQLite or plan an approved managed-database migration.
- DEPENDENCIES: HARDEN-001, HARDEN-002; user hosting decision.
- SCOPE: Architecture decision and environment matrix; no production deployment.
- RISK: High; SQLite is incompatible with many stateless/multi-instance targets.
- ACCEPTANCE_CRITERIA: Hosting, persistence, TLS, secrets, backups, health checks, and rollback approach are explicitly documented.
- STATUS: BLOCKED_PENDING_HOSTING_DECISION

#### DEPLOY-002 — Add release verification and operations checklist

- OBJECTIVE: Make install, Prisma generate/deploy, lint, test, typecheck, build, health verification, and rollback reproducible.
- DEPENDENCIES: DEPLOY-001.
- SCOPE: Documentation/scripts/CI checks; no deploy.
- RISK: Medium.
- ACCEPTANCE_CRITERIA: Clean-environment dry run passes with secrets redacted and database changes limited to disposable targets.
- STATUS: PLANNED
