# Implementation Plan: 876 Projects Phase 3 — Task Lists, WBS, Cycles

- **Run ID:** `2026-09-15-projects-phase-3`
- **Branch:** `feature/projects-phase-3-task-lists`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **Task List** is a new project-owned model `TaskList` (`projects_task_lists`): `projectId`, optional `milestoneId` (phase; Task Lists may exist without a Phase), `name`, `description`, `ownerUserId` (opaque), `startDate`, `targetDate`, `position`, `archivedAt`, `deletedAt`, timestamps. Resource/object discriminator `task-list`, route segment `/task-lists`.
2. `Issue.taskListId` nullable FK (SetNull). A work item's phase is still `milestoneId`; when a work item is moved to a Task List that has a phase, the item's `milestoneId` is set to the list's phase (hierarchy Phase → Task List → Work Item stays consistent). Moving to a list without a phase leaves `milestoneId` unchanged.
3. Task List progress is derived (total/completed issue counts), never stored. Archive = `archivedAt` set; archived lists are hidden from default list reads (`includeArchived` opt-in). Delete stays soft.
4. WBS is a read model: `GET /projects/:projectId/work-breakdown` returns phases → task lists → root work items (+ sub-item counts), plus task lists without a phase and unlisted items.
5. **Cycles** finish on the existing `Cycle` model (additive: `description`, `goal`, `deletedAt`). CRUD, status derived from dates (`upcoming|active|completed`), assign/unassign work items via `Issue.cycleId`, progress (total/completed/estimate points) and throughput (items completed within the cycle window).
6. Permissions reuse `projects.view` for reads and `projects.edit` for writes (no new ungranted permission family), same as Phase 2.
7. Additive hand-written migration only.

## Briefs

| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/3a-api.md | Codex `-p muse` | projects-api schema/migration/modules/tests + `@876/projects` resources |
| briefs/opencode/3b-app.md | opencode free / Cline | projects app pages, routes, UI (after 3a) |

## Checklist

- [ ] 3a API + client
- [ ] 3b App UI
- [ ] Orchestrator verification
- [ ] PR merged
