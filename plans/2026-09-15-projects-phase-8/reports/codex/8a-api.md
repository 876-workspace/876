# Report 8a — Projects API: time entries, timers, timesheets, approvals

- Branch: `feature/projects-phase-8-time`
- Status: implemented, all 7 verification commands green
- Scope: this report covers Brief 8a files only. The working tree also holds
  parallel 8b UI work (`packages/projects-ui/src/time-*.tsx`,
  `apps/projects/**`, `apps/projects-api` untouched by 8a outside the files
  listed below) written by another delegate; it was left alone.

## Files

New:

- `apps/projects-api/prisma/schema/time.prisma` — `TimeEntry`, `Timesheet`,
  `TimesheetEvent` models, indexes pinned with `map:`.
- `apps/projects-api/prisma/migrations/20260920000000_time_tracking/migration.sql`
- `apps/projects-api/src/modules/time/time.schemas.ts`
- `apps/projects-api/src/modules/time/time.serializers.ts`
- `apps/projects-api/src/modules/time/time.repository.ts`
- `apps/projects-api/src/modules/time/time.service.ts`
- `apps/projects-api/src/modules/time/time.controller.ts`
- `apps/projects-api/src/modules/time/time.routes.ts`
- `apps/projects-api/src/modules/time/index.ts`
- `apps/projects-api/src/modules/time/__tests__/time.test.ts`
- `packages/projects/src/resources/time-entries.ts`
- `packages/projects/src/resources/time-entries.test.ts`
- `packages/projects/src/resources/timesheets.ts`
- `packages/projects/src/resources/timesheets.test.ts`

Modified:

- `apps/projects-api/prisma/schema/tenant.prisma` — back-relations
  `timeEntries`, `timesheets`, `timesheetEvents`.
- `apps/projects-api/prisma/schema/project.prisma` — back-relation `timeEntries`.
- `apps/projects-api/prisma/schema/issue.prisma` — back-relation `timeEntries`.
- `apps/projects-api/prisma/schema/work-structure.prisma` — back-relations
  `timeEntries` on `Milestone` and `TaskList`.
- `apps/projects-api/src/platform/ids.ts` — prefixes `tme_`, `tsh_`, `tshe_`.
- `apps/projects-api/src/http/errors.ts` — 9 registered error codes (below).
- `apps/projects-api/src/http/routes.ts` — mounts `createTimeRouter()` under
  `/v1/organizations/:organizationId`.
- `packages/projects/src/types.ts` — time/timesheet/summary schemas + inputs.
- `packages/projects/src/client.ts` — `timeEntries`, `timesheets` namespaces.
- `packages/projects/src/contracts.ts`, `index.ts` — re-export new schemas/types.
- `packages/projects/src/client.test.ts` — namespace enumerations extended
  (no new cases).

## New error codes

`projects/time-entry-not-found` 404, `projects/timer-not-found` 404,
`projects/time-entry-forbidden` 403, `projects/time-entry-locked` 409,
`projects/timesheet-not-found` 404, `projects/timesheet-forbidden` 403,
`projects/timesheet-self-approval` 403, `projects/timesheet-note-required` 400,
`projects/timesheet-transition-invalid` 422.

## Full migration SQL (`20260920000000_time_tracking/migration.sql`)

```sql
-- CreateTable projects_timesheets
CREATE TABLE "projects_timesheets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_start" BIGINT NOT NULL,
    "period_end" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" BIGINT,
    "decided_at" BIGINT,
    "decided_by" TEXT,
    "note" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_time_entries
CREATE TABLE "projects_time_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "milestone_id" TEXT,
    "task_list_id" TEXT,
    "user_id" TEXT NOT NULL,
    "started_at" BIGINT NOT NULL,
    "ended_at" BIGINT,
    "duration_minutes" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'draft',
    "timesheet_id" TEXT,
    "created_by" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_timesheet_events
CREATE TABLE "projects_timesheet_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "note" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_timesheet_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_timesheets_tenant_user_idx" ON "projects_timesheets"("tenant_id", "user_id");
CREATE INDEX "projects_time_entries_tenant_user_start_idx" ON "projects_time_entries"("tenant_id", "user_id", "started_at");
CREATE INDEX "projects_time_entries_tenant_project_idx" ON "projects_time_entries"("tenant_id", "project_id");
CREATE INDEX "projects_time_entries_tenant_issue_idx" ON "projects_time_entries"("tenant_id", "issue_id");
CREATE INDEX "projects_time_entries_tenant_sheet_idx" ON "projects_time_entries"("tenant_id", "timesheet_id");
CREATE INDEX "projects_timesheet_events_tenant_sheet_idx" ON "projects_timesheet_events"("tenant_id", "timesheet_id");
-- A user may have at most one running entry at a time: a running entry is a
-- row with ended_at IS NULL that has not been soft-deleted.
CREATE UNIQUE INDEX "projects_time_entries_one_running_idx" ON "projects_time_entries"("tenant_id", "user_id") WHERE "ended_at" IS NULL AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "projects_timesheets" ADD CONSTRAINT "projects_timesheets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_milestone_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_task_list_fkey" FOREIGN KEY ("task_list_id") REFERENCES "projects_task_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_time_entries" ADD CONSTRAINT "projects_time_entries_timesheet_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "projects_timesheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_timesheet_events" ADD CONSTRAINT "projects_timesheet_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_timesheet_events" ADD CONSTRAINT "projects_timesheet_events_timesheet_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "projects_timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Longest identifier is 43 chars
(`projects_time_entries_tenant_user_start_idx`); all names pinned with `map:`.

## Counted tests

- projects-api: **95 new `it()`** in
  `apps/projects-api/src/modules/time/__tests__/time.test.ts`
  (suite total 640, was 545). Covers: duration rounding (90s→2, 89s→1,
  clamp), manual duration override, second timer stops first and returns both,
  stop-without-timer 404, cross-user timer isolation, edit/delete refused when
  approved (409) and when submitted (409), draft/rejected edits allowed, recall
  by owner only (403 otherwise), approve/reject by submitter refused (403),
  reject without note refused (400), transition events with from/to, per-group
  totals for project/user/issue/day, billable split, tenant scoping on every
  read/write path, soft-deleted rows excluded from summaries and details.
- `@876/projects`: **17 new `it()`** — 9 in `time-entries.test.ts`, 8 in
  `timesheets.test.ts` (package total 138). Path/query/body contract per method.
- New repositories are mocked in the time suite; the suite reuses the calendar
  transitive-mock block plus a `time.repository` mock, so no DB pool is touched.

## Decisions

1. `POST /time-entries` creates completed manual entries only (`endedAt`
   required); running entries are created exclusively via
   `POST /time-entries/timer/start`, which stops the previous timer in the
   same Prisma `$transaction` (`startTimerAtomic`) and returns both rows.
2. Timer `start` accepts an optional `startedAt`; when given, that moment is
   also the stop moment for the previous timer, keeping tests deterministic
   without fake timers. `stop` accepts an optional `endedAt` (defaults to now).
3. Entry `approvalStatus` mirrors its timesheet (`draft|submitted|approved|
   rejected`) on every transition so entry filters stay useful; totals stay
   derived on read, never stored.
4. `submit` is allowed from `draft` and from `rejected` (resubmit after
   corrections); `approve`/`reject` from `submitted`; `recall` from
   `submitted` by the owner only. `approved` is terminal.
5. Rejection notes are stored on both the timesheet row and its transition
   event; approval notes (optional) live on the event only.
6. Timesheet creation attaches explicit `entryIds` when given, else
   auto-attaches the owner's unattached entries overlapping the period.
   Cross-user or already-attached entries are refused.
7. `projects.edit` for approvers is not evaluated inside projects-api: the
   service sits behind the internal-key boundary and enforces no-self-approval
   plus owner-only submit/recall; caller surfaces own that permission check.
8. Read paths are tenant-scoped; per-user read restriction beyond the
   internal-key tier is not enforced (approvers must read others' sheets).
   Mutation paths enforce ownership (`time-entry-forbidden`,
   `timesheet-forbidden`).
9. Client `currentTimer` uses a nullable `timeEntry` schema; timer-start
   returns `{ stopped, started }` without an `object` discriminator (a pair,
   not a resource).
10. Package enum schema for the summary group-by is `timeSummaryGroupBySchema`
    to avoid colliding with the result-group `timeSummaryGroupSchema`.

## Unverified items

- Migration SQL is hand-written and `prisma validate`/`generate` pass, but it
  was never applied to a live database (`prisma migrate` forbidden); the
  partial unique index and FK targets should be confirmed on first deploy.
- No concurrency test proves two simultaneous `timer/start` calls cannot both
  win; the partial unique index is the backstop and a unique-violation there
  surfaces as 500, not a registered error.
- `GET /time-summary` `groupBy=issue` yields `key: null` for entries without
  an issue rather than an `unassigned` bucket.
- Full-repo `pnpm check` was not run; verification was limited to the seven
  brief-listed commands, all green:

```text
prisma validate   — schemas valid
prisma generate   — client generated
api typecheck     — EXIT 0
api lint          — EXIT 0, no warnings
api test          — 22 files, 640 tests passed
projects typecheck — EXIT 0
projects test     — 22 files, 138 tests passed
```
