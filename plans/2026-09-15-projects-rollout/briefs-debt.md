# Known debt from phases 1-7 (fix list for brief 8d)
1. Phase 4: the work-item picker for adding a relation/dependency loads up to 200 candidates and is not project-scoped.
2. Phase 7: `POST /api/attachments/link` and `attachmentsClient.link()` exist and are tested but no UI calls them.
3. Phase 1: Projects settings nav lists Teams, Categories and Priorities as available but no page exists for them.
4. Phase 5/8: `project-gantt.tsx` and `time-entry-list.tsx` link work items by `id`; `issue-list.tsx` links by `identifier`. Both resolve (the API's retrieve accepts either), but the id form produces unreadable URLs and an unreadable browser title. Settle on `identifier` in the final review; `GanttRow` would need to carry it.
