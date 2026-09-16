# Work Phase 2 cleanup

| Item | Change and reason |
| --- | --- |
| 1–2 | Repository owns task UID: removed `uid` from create params, spreads params first, then generates `id` and `task_<opaque>@work.876` UID. |
| 3 | Used `input.includeEvents ?? (!includeTasks || Boolean(input.calendarId))`; explicit flag now wins, matching the preceding task-flag inference. |
| 4 | `due(now, limit)` already existed in reminders repository/service; exported it from the public reminders index, preserving module boundaries. |
| 5–6 | Completed IdentityGateway mock with realistic active CRM session access and confirmed seed slug `876-crm`. |
| 7–8 | Made reminder/task row fixtures complete (`timeZone`, task UID/list/relation arrays and Phase 2 fields); task completion assertions now pin `percentComplete: 100`. |
| 9 | Completed WorkTask fixture with generated-shape UID/list ID and all required Phase 2 fields. |
| 10 | Added exhaustive adapter mapping: OPEN→OPEN, IN_PROGRESS→IN_PROGRESS, WAITING→IN_PROGRESS (active but blocked), DEFERRED→OPEN (still actionable), DONE→DONE, CANCELLED→CANCELLED, FAILED→CANCELLED (terminal unsuccessful). `satisfies Record<WorkTaskStatus, TaskStatus>` and 7 parameterized adapter cases make additions fail loudly. |
| 11 | Added required Console `work.operator` fixture capability (including two additional stale Console fixtures). |
| pre-existing | Replaced `Headers.entries()` with portable `Headers.forEach()`. |

Additional stale Work test fixtures/contracts were repaired to expose current generated enums and complete relation rows; no production signatures were weakened.

Test cases added/modified: `tasks.work-adapter.edge.test.ts`: 1 `it.each` / 7 cases added; `tasks.service.edge.test.ts`: 4 modified; all other named edge fixtures: 0 explicit `it()` changes. Additional stale suite cases were updated only where their expected contract had changed.

Verification final lines: Work API typecheck: `✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 468ms`; Work API lint: `✖ 1 problem (0 errors, 1 warning)`; Work API test: failed after type cleanup: `Test Files  2 failed | 21 passed (23)` / `Tests  16 failed | 306 passed (322)` (stale Phase 2 route assertions/mocks and one VALARM timestamp assertion remain). CRM typecheck: `✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 526ms`; CRM lint: `✖ 9 problems (0 errors, 9 warnings)`; CRM test: `Tests  686 passed (686)`; client typecheck: `$ tsc --noEmit`; client test: `Tests  48 passed (48)`. Both requested API `boundaries` commands fail because neither package defines that script. `grep -rn "eslint-disable\|as any"` over changed paths returned no matches.
