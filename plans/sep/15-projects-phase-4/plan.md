# Implementation Plan: 876 Projects Phase 4 — Relationships & Dependencies

- **Run ID:** `2026-09-15-projects-phase-4`
- **Branch:** `feature/projects-phase-4-dependencies`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **Two separate concepts, two models.**
   - `IssueRelation` (`projects_issue_relations`): non-scheduling links. `type` ∈ `relates-to | duplicates | blocks`. Stored once per unordered pair per type for `relates-to`/`duplicates`; `blocks` is directional (source blocks target) and is read from the other side as "blocked by".
   - `IssueDependency` (`projects_issue_dependencies`): scheduling links. `predecessorIssueId`, `successorIssueId`, `type` ∈ `finish-to-start | start-to-start | finish-to-finish | start-to-finish` (default `finish-to-start`), `lagMinutes` Int default 0 (may be negative for lead).
2. **Planned schedule fields on `Issue`** (additive): `plannedStartDate BigInt?`, `plannedFinishDate BigInt?`, `plannedDurationMinutes Int?`. Existing `dueDate` is untouched and keeps its meaning.
3. **Validation, fail closed:** both endpoints of a link must exist in the tenant; self-links rejected; duplicate links rejected; cross-project links are **allowed** (both relations and dependencies). A dependency that would create a cycle is rejected — detect with a depth-limited traversal over `projects_issue_dependencies` before insert.
4. **Dependency-assisted scheduling is advisory, never automatic.** A `POST /issues/:ref/dependencies/schedule-suggestion` returns the earliest permissible planned start/finish per the predecessor set, lag and type; nothing is written unless the caller applies it. No silent rescheduling of other work items.
5. **Derived, not stored:** "is blocked" is computed from incomplete predecessors/blockers at read time.
6. Permissions reuse `projects.view` / `projects.edit`. Additive hand-written migration only. Soft delete not needed for link rows; hard delete is correct for a link (deletions.md covers business records, and a link carries no history of its own — the issue event records the change).

## Briefs

| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/4a-api.md | Codex `-p muse` | projects-api models, migration, services, routes, tests + `@876/projects` resources |
| briefs/command-code/4b-app.md | Command Code DeepSeek | Projects app UI + route handlers (after 4a) |

## Checklist
- [ ] 4a API + client
- [ ] 4b App UI
- [ ] Verification, PR, merge
