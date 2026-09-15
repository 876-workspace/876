# Brief 3c — Accept cycleId on issue create/update (projects-api), then simplify the app route

Branch `feature/projects-phase-3-task-lists`. Do not commit/branch. No `eslint-disable`/`as any`/`@ts-ignore`. No prisma migrate (no schema change needed: `projects_issues.cycle_id` already exists). One verification command at a time. No run logs.

## Why
`apps/projects/src/app/api/issues/route.ts` and `api/issues/[issueRef]/route.ts` currently strip `cycleId` and then call `projects.cycles.assignIssues` / `unassignIssue` as a second service call, because the API's issue body schemas are strict and lack `cycleId`. That puts sequencing logic in a transport route. Fix the owning service instead.

## Deliver
1. `apps/projects-api/src/modules/issues/issues.schemas.ts`: add `cycleId: z.string().trim().nullable().optional()` to the create and update body schemas (mirror `taskListId` exactly, both places).
2. `apps/projects-api/src/modules/issues/issues.service.ts`: mirror the existing `taskListId` handling for `cycleId` — resolve via a work-structure `resolveCycleById(tenantId, id)` (add it to `work-structure.service.ts` + `index.ts` beside `resolveTaskListById` if absent), reject when the cycle does not exist or its `projectId` is set and differs from the target project (same error style as the task-list branch), persist on create and update, and record an issue event on change exactly like the task-list event.
3. `apps/projects/src/app/api/issues/route.ts` and `api/issues/[issueRef]/route.ts`: pass `cycleId` straight through in the single `projects.issues.create/update` call; delete the assign/unassign fallback and the re-read. Keep the strict zod bodies accepting `cycleId`. Update `route.test.ts` in both places so the cycle expectations assert the single call.
4. Tests (floor ≥ 10 new `it()` in projects-api): create with cycle, update setting/clearing cycle, wrong-project cycle rejected, unknown cycle rejected, event recorded, serializer output.

## Verify
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test

## Report
`plans/2026-09-15-projects-phase-3/reports/codex/3c-issue-cycle-field.md`.
