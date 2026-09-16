# Brief 8d — Projects app: close three known gaps from phases 1, 4 and 7

Repo `/root/projects/876`, branch `feature/projects-phase-8-time`.

**You own ONLY files under `apps/projects/src/`.** Two other agents are working in `apps/projects-api`, `packages/projects` and `packages/projects-ui` right now — do not open or edit anything in those. Do not touch `apps/projects/src/features/projects/components/time-*`, `timer-*` or `timesheet-*` (a later brief owns those).

Hard rules: no commit/branch/prisma. No `eslint-disable`/`as any`/`@ts-ignore`. No server actions. No run logs. One verification command at a time. Read budget: the files named below plus the ones you edit.

## Gap 1 — the link picker is capped and unscoped
`apps/projects/src/features/projects/components/issue-links-panel.tsx` (and its data component) load up to 200 work items and do not scope to the current project, so an item outside that window cannot be linked.
Fix: make the picker **search server-side**. Add `GET`-free flow: a route handler `app/api/issues/search/route.ts` (authorize `issues.view`) taking `q` and optional `projectId`, calling the existing issues list/search verb on `projects.issues` with a limit of 25, returning the envelope. The picker debounces input (300 ms) and queries that route; it defaults to the current work item's project with an explicit "All projects" toggle. Remove the 200-item preload.

## Gap 2 — attachments cannot link an existing file
`POST /api/attachments/link` and `attachmentsClient.link()` already exist and are tested. Add the surface: in `features/projects/components/attachments-panel.tsx`, an "Attach existing file" action that lists the organization's Projects-linked files (through a new async data prop supplied by `attachments-data.tsx`, which already has the storage service) and links the chosen one. Do not add a new route handler — reuse the existing link route. Do not let the browser reach Storage directly.

## Gap 3 — settings nav advertises pages that do not exist
`apps/projects/src/app/(app)/settings/_lib/settings-nav.ts` marks Teams, Categories and Priorities as available, but there is no page for them. Nothing may claim a surface that does not exist: mark those three entries unavailable (match how other planned-but-unbuilt entries are represented in that file — read it and follow the existing shape; if there is no such representation, remove the three entries). Update `settings-nav.test.ts` expectations to match.

## Tests, floor ≥ 14 `it()`
Search route: 403 unauthorized, 422 blank query, success envelope, limit passed as 25, projectId forwarded. Picker: debounces, renders results, "All projects" toggle changes the query, selecting calls the link client once. Attachments: existing-file action lists and links, calling the client once with the file id. Settings nav: the three entries are no longer advertised as available, and every advertised href has a page (walk `src/app/(app)/settings/` in the test).

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs

## Report
`plans/2026-09-15-projects-phase-8/reports/cline/8d-debt.md`: files, counted tests, decisions, unverified items.
