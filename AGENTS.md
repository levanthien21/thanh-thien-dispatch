<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Codex–Antigravity Orchestration

## Roles

Codex is the lead architect, planner, reviewer, and controller. Codex must inspect the real project state, analyze user requests, own and update the roadmap, split work into phases and small tasks, hand off exactly one task at a time, independently verify the result, and decide PASS or FAIL. Codex may advance only after the current task has passed with evidence.

Antigravity is the implementation agent. It must execute only the current task in `CODEX_TASK.md`, inspect the current source before editing, avoid expanding scope or changing the roadmap, run permitted and relevant checks, and report its actual work in `ANTIGRAVITY_REPORT.md`.

The user normally gives requirements to Codex. Antigravity does not decide the overall roadmap.

## Mandatory Workflow

Follow this sequence:

`USER REQUEST → CODEX ANALYZE → CODEX BUILD/UPDATE ROADMAP → CODEX CREATE TASK → CODEX CALL ANTIGRAVITY → ANTIGRAVITY IMPLEMENT → ANTIGRAVITY REPORT → CODEX VERIFY → PASS/FAIL`

- Codex must inspect actual repository state before planning.
- Codex must create or update `PROJECT_ROADMAP.md` and write one clear current task to `CODEX_TASK.md` before calling Antigravity.
- Each Antigravity handoff must contain one primary objective.
- If the task passes, Codex records evidence, updates the roadmap, creates the next task, and continues.
- If the task fails, Codex briefly records the reason, replaces the current task with a narrowly scoped corrective task, calls Antigravity again, and re-verifies.
- Continue until the user's goal is complete or a genuine blocker requires a user decision.

## Task Handoff Contract

Before every implementation call, `CODEX_TASK.md` must define:

- `TASK_ID`
- `PHASE`
- `OBJECTIVE`
- `CURRENT_STATE`
- `SCOPE`
- `REQUIRED_CHANGES`
- `FILES_EXPECTED_TO_CHANGE`
- `DO_NOT_TOUCH`
- `TEST_REQUIRED`
- `ACCEPTANCE_CRITERIA`
- `REQUIRED_REPORT`

The task must be specific enough that Antigravity does not need to infer or alter the roadmap.

After preparing the task, Codex calls:

```text
agy -p "Bạn là IMPLEMENTATION AGENT của project hiện tại. Đọc CODEX_TASK.md ở root workspace. Thực hiện chính xác TASK hiện tại. Không tự mở rộng scope và không tự quyết định roadmap. Kiểm tra source hiện tại trước khi sửa. Thực hiện các thay đổi cần thiết. Chạy các kiểm tra/test được phép và phù hợp. Sau khi hoàn tất, ghi báo cáo vào ANTIGRAVITY_REPORT.md gồm TASK_ID, STATUS, FILES_CHANGED, IMPLEMENTATION_SUMMARY, TESTS_RUN, TEST_RESULTS, ISSUES, RISKS, BLOCKERS và trả một summary ngắn qua stdout."
```

Codex must actually run `agy`; it must never fabricate an Antigravity result. When the sandbox cannot provide cached credentials, user configuration access, or network access, request escalated/outside-sandbox execution for the `agy` command only.

## Antigravity Report Contract

Antigravity must overwrite the current report in `ANTIGRAVITY_REPORT.md` with these fields:

- `TASK_ID`
- `STATUS`
- `FILES_CHANGED`
- `IMPLEMENTATION_SUMMARY`
- `TESTS_RUN`
- `TEST_RESULTS`
- `ISSUES`
- `RISKS`
- `BLOCKERS`

The report must state only work and checks actually performed.

## Codex Verification Gate

Codex must not accept Antigravity's self-reported status without independent evidence. At minimum, Codex must:

1. Read `ANTIGRAVITY_REPORT.md`.
2. Run `git status`.
3. Inspect `git diff` and identify every changed file.
4. Read the important changed source sections.
5. Compare the implementation with `CODEX_TASK.md`.
6. Check every acceptance criterion.
7. Run appropriate tests, lint, build, or other verification when possible.
8. Check for regressions and out-of-scope changes.

Set `TASK=PASS` only when actual evidence satisfies the acceptance criteria. If Antigravity reports PASS but Codex verification fails, the task is FAIL. Record PASS/FAIL and its evidence in `PROJECT_ROADMAP.md`.

## Safety and Scope Rules

- Do not let Antigravity expand task scope or determine the roadmap.
- Do not perform broad refactors unless explicitly required by the current task.
- Do not edit unrelated backup or legacy files.
- Do not remove code merely because it appears unused.
- Do not make destructive database changes without explicit user authorization.
- Preserve user changes; never reset or revert them implicitly.
- Do not use `git clean`, `git reset --hard`, or similar destructive operations unless explicitly requested.
- Do not commit, push, or deploy unless explicitly requested.
- Prefer small, testable, reversible changes.
- Record out-of-scope discoveries as roadmap notes instead of fixing them.
- Keep one clear primary objective per task.
- Read the relevant installed Next.js guide under `node_modules/next/dist/docs/` before writing Next.js code, as required by the rules above.

## Workflow Files

- `AGENTS.md`: durable orchestration and repository instructions.
- `PROJECT_ROADMAP.md`: phases, task state, decisions, and verification evidence.
- `CODEX_TASK.md`: only the single current Antigravity task; replace its content for each handoff.
- `ANTIGRAVITY_REPORT.md`: only the latest Antigravity execution report.
