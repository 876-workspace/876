# Phase 1 — delete CRM's dead task and reminder layer

## What is dead, and why

CRM migrated tasks and reminders onto the Work service. `tasks.service.ts` and
`reminders.service.ts` call `workClient()` and make **zero** `prisma.` calls —
verify that yourself before deleting anything, and say so in your report.

What the migration left behind:

| Dead thing | Evidence |
| --- | --- |
| `apps/crm-api/src/modules/tasks/tasks.repository.ts` (49 lines) | imported by nothing but a `vi.mock()` stub |
| `apps/crm-api/src/modules/reminders/reminders.repository.ts` (46 lines) | same |
| `RequestTask` model | never written; only reader is a vestigial branch below |
| `RequestReminder` model | never written |
| the `prisma.requestTask` branch in `priorities.repository.ts:isReferenced` | always empty — the real guard is `priorities.service.ts:139`, which asks Work and fails closed |

The user's standing directive: *"if something is being deprecated, it must be
removed and all references updated. no backwards compatibility."* The platform
is pre-launch.

## Do

1. Confirm `tasks.service.ts` and `reminders.service.ts` contain no `prisma.`
   call. **If either does, stop and report** — the migration is not complete and
   deleting the repository would break it.
2. Delete both repository files.
3. Remove the two `vi.mock('../../tasks/tasks.repository.js', …)` and
   `vi.mock('../../reminders/reminders.repository.js', …)` lines from
   `apps/crm-api/src/modules/requests/__tests__/requests.test.ts` and
   `requests.cross-organization.routes.test.ts`. They mock modules that will no
   longer exist. Run those suites after — if a test then fails because it was
   relying on the stub, report it rather than reinstating the mock.
4. Remove the `prisma.requestTask` branch from `isReferenced` in
   `priorities.repository.ts`, and its destructured `task` variable. Leave the
   `request`, `category`, `subcategory` and `form` checks alone. **Do not touch
   `priorities.service.ts`** — its Work check is the real guard and must stay.
5. Remove `RequestTask`, `RequestReminder`, and any enum used only by them
   (check `TaskStatus`, `ReminderStatus` — if another model uses one, keep it)
   from `apps/crm-api/prisma/schema/task.prisma`. Remove the back-relations on
   `Tenant` and any other model that referenced them.
6. `pnpm --filter @876/crm-api db:generate` (or the repo's generate script) so
   the Prisma client no longer types the dropped models.

## The migration — write it, do not run it

Dev and production share the same databases, and a `DROP TABLE` is not
additive. Write the SQL by hand to:

```
apps/crm-api/prisma/migrations/20260919120000_drop_dead_request_task_tables/migration.sql
```

Use the timestamp format of the existing folders in that directory. The SQL
drops the two tables and any enum that becomes unused. **Do not run
`prisma migrate dev`, `prisma migrate deploy`, or any command that touches a
database.** Paste the SQL into your report.

## Hard prohibitions

- Do not modify `priorities.service.ts`.
- Do not delete a model that still has a reader — grep first.
- Do not add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do not run any database command.
- Do not touch any app other than `apps/crm-api`.
- Do not `git commit`, branch, or open a PR.

## Verify

```
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm-api boundaries
grep -rn "requestTask\|requestReminder\|RequestTask\|RequestReminder" apps/crm-api/src apps/crm-api/prisma/schema   # expect 0
```

## Report

`plans/sep/19-work-convergence/reports/command-code/2026-09-19-phase1.md` —
the confirmation that both services were prisma-free, files deleted, the
migration SQL in full, the final grep, verification output, and anything you
could not verify.
