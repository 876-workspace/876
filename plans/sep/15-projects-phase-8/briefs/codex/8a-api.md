# Brief 8a — Projects API: time entries, timers, timesheets, approvals

Repo `/root/projects/876`, branch `feature/projects-phase-8-time`. Read `plans/2026-09-15-projects-phase-8/plan.md` — binding.
Rules: `.claude/rules/express-api.md`, `.claude/rules/naming.md`, `.claude/rules/error-handling.md`, `.claude/rules/testing.md`, `.claude/rules/deletions.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Index/constraint names ≤ 63 chars pinned with `map:`.

## Reference (read only these)
`apps/projects-api/src/modules/calendar/calendar.{service,repository,serializers,schemas,controller}.ts` (Phase 6 module shape), `src/modules/projects/baselines.service.ts` (snapshot/immutability pattern), migration `prisma/migrations/20260919000000_calendar_reminders/migration.sql`, client `packages/projects/src/resources/reminders.ts`. New repositories must be mocked in suites that transitively import routes (see `src/modules/labels/__tests__/labels.test.ts`).

## Deliver
1. **Schema + migration** `prisma/migrations/20260920000000_time_tracking/migration.sql`: `TimeEntry`, `Timesheet`, `TimesheetEvent` exactly per the plan. Indexes: `(tenantId, userId, startedAt)`, `(tenantId, projectId)`, `(tenantId, issueId)`, `(tenantId, timesheetId)`, and a **partial unique index** guaranteeing at most one running entry per user: `CREATE UNIQUE INDEX ... ON projects_time_entries (tenant_id, user_id) WHERE ended_at IS NULL AND deleted_at IS NULL` (add it in SQL; note in the Prisma schema that it is enforced in the database).
2. **Module** `src/modules/time/time.{controller,repository,schemas,serializers,service}.ts` + routes (internal-key guarded):
   - `GET/POST /time-entries` (filters: userId, projectId, issueId, from, to, billable, approvalStatus), `GET/PATCH/DELETE /time-entries/:id`
   - `POST /time-entries/timer/start` (body: project + optional issue/phase/task list, note, billable), `POST /time-entries/timer/stop`, `GET /time-entries/timer/current?userId=`
   - `GET/POST /timesheets`, `GET /timesheets/:id` (entries + derived totals), `POST /timesheets/:id/submit|approve|reject|recall`, `GET /timesheets/:id/events`
   - `GET /time-summary?groupBy=project|user|issue|day&from&to` → totals in minutes, split billable/non-billable
   - Starting a timer while one runs stops the previous one in the **same transaction** and returns both.
   - Editing or deleting an entry attached to an approved timesheet is refused with a registered error. Same for entries in a submitted timesheet, except the owner's recall path.
   - Reject requires a note. Approve and reject refuse when the actor is the submitter.
   - Register every new error code in the projects error registry.
3. **`@876/projects`**: `resources/time-entries.ts`, `resources/timesheets.ts` + tests; types; wired on the client.
4. **Tests, floor ≥ 60 new `it()` in projects-api and ≥ 14 in the package**: duration computed on stop and rounded, manual entry duration accepted, second timer stops the first (and only one running row remains), stop with no running timer 404s, cross-user timer isolation, entry edit refused when approved, delete refused when approved, recall by owner only, approve by submitter refused, reject without a note refused, transition events written with from/to, totals derived per group, billable split, tenant isolation, soft-deleted entries excluded from summaries.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-8/reports/codex/8a-api.md`: files, full migration SQL, counted tests, decisions, unverified items.
