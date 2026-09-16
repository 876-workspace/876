# Implementation Plan: 876 Projects Phase 8 — Time Tracking & Timesheets

- **Run ID:** `2026-09-15-projects-phase-8`
- **Branch:** `feature/projects-phase-8-time`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **One `TimeEntry` model** (`projects_time_entries`): tenant, project (required), optional `issueId`/`milestoneId`/`taskListId`, `userId` (opaque), `startedAt`, `endedAt` (null while a timer runs), `durationMinutes` (stored, authoritative once stopped), `billable` (bool), `note`, `approvalStatus` ∈ `draft|submitted|approved|rejected`, `timesheetId`, `createdBy`, soft-delete columns.
2. **A running timer is a time entry with `endedAt = null`.** No separate timer table and no client-side clock as the source of truth. **A user may have at most one running entry at a time** — starting a second stops the first, atomically, in the service.
3. **`durationMinutes` is computed by the server on stop** from `startedAt`/`endedAt`, rounded to the nearest minute; a manual entry supplies duration directly. The browser never sends an elapsed time it computed itself.
4. **Timesheets are a submission envelope, not a copy of the entries.** `projects_timesheets`: tenant, `userId`, `periodStart`, `periodEnd`, `status` ∈ `draft|submitted|approved|rejected`, `submittedAt`, `decidedAt`, `decidedBy`, `note`. Entries point at a timesheet; totals are derived on read, never stored.
5. **Approval transitions are explicit and audited**: submit (draft→submitted), approve, reject (submitted→approved|rejected), recall (submitted→draft by the owner only). An approved timesheet's entries are **locked** — edit and delete are refused. Every transition writes a `projects_timesheet_events` row (actor, from, to, note).
6. **Authorization**: a user reads and writes only their own entries and timesheets; approving requires `projects.edit` and the approver must not be the submitter (no self-approval). Enforced in the service, not the route.
7. **Billable is a flag only.** Phase 8 does **not** compute money — no rates, no cost, no invoice. That is Phase 9. Reports here are counts of minutes.
8. Additive migration; index names ≤ 63 chars pinned with `map:`.

## Briefs
| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/8a-api.md | Codex `-p muse` | time entries, timers, timesheets, approvals, summaries, client resources |
| briefs/command-code/8b-app.md | Command Code | timer UI, time entry forms, my time, project/work-item time, timesheet submit/approve screens |

## Checklist
- [ ] 8a API + client
- [ ] 8b App UI
- [ ] Verification, PR, merge
