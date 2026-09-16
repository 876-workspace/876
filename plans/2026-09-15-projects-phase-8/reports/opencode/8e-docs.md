# Brief 8e report — Projects rollout docs

- Branch: `feature/projects-phase-8-time` (no commit, no branch, no code changes, no run logs beyond `prettier --check/--write` on the owned doc).
- File owned and updated: `docs/876-projects.md` only.

## Sections added or rewritten

- `What it is` + `Object model` (new): one place for Project → Phase → Task List → Work Item → Sub-item plus Cycles, with the four work-item references (`milestoneId`, `taskListId`, `cycleId`, parent).
- `Work items`, `Filters and grouping` (new, from Phase 1 report): detail fields, shared form, server-owned identity, blocked badge, `has_more` honesty, URL-backed filters, grouping set, legacy board columns.
- `Phases` (rewrote existing): kept the Milestone compatibility boundary, added owner/progress/clone-config-only/permissions from the Phase 2 plan.
- `Task Lists and work breakdown`, `Cycles` (new, Phase 3): model shape, archive/soft-delete, move-adopts-phase rule, WBS read model, derived status/progress/throughput, `cycleId`-via-Cycle-verbs caveat.
- `Relationships and dependencies` (new, Phase 4): two models, four dependency types plus lag, planned fields, fail-closed validation incl. cross-project-allowed and cycle rejection, advisory suggestion, 200-item picker window.
- `Gantt, critical path, and baselines` (new, Phase 5): server read model, status→percent mapping, UTC math, drag-writes-one-item, immutable baselines, one-comparison-at-a-time with day variance.
- `Calendar, events, recurrence, reminders, My Work` (new, Phase 6): read-model kinds, single event table, stored-rule recurrence with skip-not-clamp month ends, intent-only reminders with creator scoping, My Work single-promise/three-boundaries, page-not-panel events, offset-only reminder UI.
- `Attachments` (new, Phase 7): Storage owns files, `projects.attachment` policy (org/audience/category/key template/12 MIME/25 MB/no SVG), three-step browser `PUT`, record-scoped idempotent link/unlink, signed-URL rows.
- `Boundaries and current limits` (new): the nine prescribed statements plus picker cap, expiring URLs, unpaginated link lists.
- `How the pieces fit` (new): API-owned read models, Suspense rendering, app `/api` mutations, no server actions.
- `API surface` (extended): task-list, cycle, relation/dependency/suggestion, gantt, baseline, event/attendee, reminder/due, calendar, my-work rows.
- `Work structure` diagram, `Migrations`, `Permissions`, `Not built yet` (updated): hierarchy now includes Task Lists, sub-items, Cycle cross-cut and attachment/reminder rows; Phase 8–16 listed as not built.

## Plan vs report contradictions (report followed)

- Phase 2 permissions: plan says all Phase writes need `projects.edit`; the pre-existing doc said create/clone need `projects.create`. Doc now follows the plan (`view`/`edit`, no `phases.*` family). Flagging because the service may still enforce `create` on some routes — not verified live.
- Phase 3 `cycleId`: the plan reads as if the issue body carries the Cycle; the 3b1 report shows the service `strictObject` has no `cycleId`, so the app strips it and assigns via Cycle verbs after the write. Doc states the two-call shape.
- Gantt `zoom`: validated (`day|week|month`) but advisory/presentation-only per 5a; doc does not present it as server re-bucketing.
- Reminders: API supports absolute `remindAt`, but the 6b UI only authors `offsetMinutesBeforeDue`. Doc states both.
- Attachments: plan supports linking an existing file; 7b reports the API exists but the panel has no UI for it. Doc states API-only.
- Percentages: 5a maps leaf rows to 100/50/0 by status while the brief prescribes "leaf items report finished or not, only groups derive a percentage". Doc phrases the boundary as "leaf items store no percentage" with group counts plus the Gantt status mapping kept in the Gantt section.

## Could not confirm (written cautiously or omitted)

- Exact dependency/relation app-route paths beyond `POST /issues/:ref/dependencies/schedule-suggestion` and the list/create/retrieve/update/delete shapes in the 4a/4b reports; table rows for relations/dependencies follow the report naming and may need a path check against committed code.
- Whether the work breakdown includes archived task lists (3b1 assumes it does; never live-verified). Doc does not claim either way.
- No live-DB migration, no live service, no browser pass for any phase (all hard-rule-forbidden or jsdom-only); visual/layout behavior (Gantt drag pixels, calendar grids, panel refresh) is documented from fixtures and tests only.
- Storage's exact `forbidden` vs `file-not-found` response for an actor who may read but not attach (7b, not observed live).
- Phase 8 behavior beyond the plan's binding decisions (time entry/timer/timesheet/approval shape, minutes-not-money): documented only as a boundary line, since implementation is owned by parallel agents.

## Verify

- `npx prettier --check docs/876-projects.md` — pass (ran `--write` first on the owned file to fix table formatting).
