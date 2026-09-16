# Implementation Plan: 876 Projects Phase 5 — Gantt, Critical Path, Baselines

- **Run ID:** `2026-09-15-projects-phase-5`
- **Branch:** `feature/projects-phase-5-gantt`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **The Gantt is a server read model, not a client join.** `GET /projects/:projectId/gantt` returns ordered rows (`phase | task-list | work-item | sub-item`) with parent row ids, planned and actual dates, percent complete, plus the project's dependency edges. The browser never assembles the hierarchy from several list calls.
2. **Scheduling remains advisory (Phase 4 rule).** Dragging or resizing a bar writes only that work item's planned dates through the existing issue update route. Nothing else is rescheduled automatically.
3. **Critical path is computed server-side** over planned dates and dependency edges (forward/backward pass, zero total float = critical) and returned as a set of work-item ids on the gantt payload. Items with no planned dates are excluded rather than guessed.
4. **Baselines are immutable snapshots.** `ProjectBaseline` + `ProjectBaselineItem` capture each work item's planned start/finish/duration and status at capture time. They are never edited; a new baseline is a new row. Comparison is derived (current minus baseline), never stored.
5. **The timeline/roadmap view is the same read model** at phase granularity — no second endpoint.
6. Permissions: `projects.view` to read, `projects.edit` to drag/resize or capture a baseline. Additive migration only.

## Briefs
| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/5a-api.md | Codex `-p muse` | gantt read model, critical path, baselines, migration, client resources |
| briefs/command-code/5b-ui.md | Command Code | `@876/projects-ui` Gantt component + app page |

## Checklist
- [ ] 5a API + client
- [ ] 5b Gantt UI
- [ ] Verification, PR, merge
