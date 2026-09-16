# Known debt from phases 1-7 (fix list for brief 8d)
1. Phase 4: the work-item picker for adding a relation/dependency loads up to 200 candidates and is not project-scoped.
2. Phase 7: `POST /api/attachments/link` and `attachmentsClient.link()` exist and are tested but no UI calls them.
3. Phase 1: Projects settings nav lists Teams, Categories and Priorities as available but no page exists for them.
4. Phase 5/8: `project-gantt.tsx` and `time-entry-list.tsx` link work items by `id`; `issue-list.tsx` links by `identifier`. Both resolve (the API's retrieve accepts either), but the id form produces unreadable URLs and an unreadable browser title. Settle on `identifier` in the final review; `GanttRow` would need to carry it.

## Added 2026-09-16 (phase 10 / Console parity)
7. Console renders cycle, task-list, calendar, timesheet-list, baseline-comparison and attachment tables with Console-local markup (`apps/console/src/features/projects/components`, `operator-format.ts`). Per shared-product-ui these belong in `@876/projects-ui` and must be promoted, with the Projects app adopting the same components.
8. Workload `plannedMinutes` is always 0: issues carry point estimates, not effort. Needs an effort field or removal from the contract.
9. `apps/console/src/lib/permissions.test.ts` pinned counts fail on main since the commerce permission catalog landed; not caused by Projects.
10. Template instantiation checks dependency cycles with its own ref-graph walk (templates module) instead of the issue-dependency service's check — consolidate into one pure cycle detector.
