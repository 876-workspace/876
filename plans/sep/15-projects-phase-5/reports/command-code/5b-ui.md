# Brief 5b — Gantt UI in `@876/projects-ui` + Projects app page

- Branch: `feature/projects-phase-5-gantt`
- Date: 2026-09-16

## Files

### `packages/projects-ui`
- `src/project-gantt.tsx` (new): `ProjectGantt` + `GanttReschedule` type. Presentation only — no data fetching, no session, no hard-coded hrefs.
- `src/project-gantt.test.tsx` (new, 24 `it()`)
- `package.json` (edit): `./project-gantt` subpath export (same `types`/`default` pair as the other entries, no barrel)

### App routes (new)
- `apps/projects/src/app/(app)/projects/[projectId]/gantt/page.tsx` — chrome (`PageBreadcrumb`, `ProjectTabs`, `ResourceToolbar`) + `<Suspense>` around the loader
- `apps/projects/src/app/(app)/projects/[projectId]/gantt/page.test.tsx` (2 `it()`)
- `apps/projects/src/app/(app)/projects/[projectId]/_components/project-tabs.tsx` — `Overview` / `Gantt` tab strip (`@876/ui/route-tabs`), shared by the detail and gantt routes
- `apps/projects/src/app/api/projects/[projectId]/baselines/route.ts` — POST capture (`projects.edit`)
- `apps/projects/src/app/api/projects/[projectId]/baselines/route.test.ts` (7 `it()`)
- `apps/projects/src/app/api/projects/[projectId]/baselines/[baselineId]/route.ts` — DELETE
- `apps/projects/src/app/api/projects/[projectId]/baselines/[baselineId]/route.test.ts` (5 `it()`)

### App feature code (new)
- `apps/projects/src/features/projects/components/gantt-data.tsx` — server loader: `projects.gantt.retrieve` + `projects.baselines.list` in parallel, then `baselines.comparison` for the selected (or newest) baseline; resolves `canEdit` from `resolveAccessContext`
- `apps/projects/src/features/projects/components/gantt-data.test.tsx` (8 `it()`)
- `apps/projects/src/features/projects/components/gantt-view.tsx` — client wrapper: owns zoom state, PATCHes `/api/issues/[issueRef]` via `issuesClient.update`, `router.refresh()` on success
- `apps/projects/src/features/projects/components/gantt-view.test.tsx` (3 `it()`)
- `apps/projects/src/features/projects/components/gantt-baselines.tsx` — capture form, baseline list, comparison table (variance in days)
- `apps/projects/src/features/projects/components/gantt-baselines.test.tsx` (9 `it()`)
- `apps/projects/src/lib/client/baselines.ts` + `lib/client/index.ts` (edit) — browser calls go through the app routes

### App edits
- `apps/projects/src/lib/services/projects.ts`: added `gantt`, `baselines` getters
- `apps/projects/src/app/(app)/projects/[projectId]/page.tsx`: awaits `params` once and renders `ProjectTabs` above the existing content (the `ProjectDetailDataFromParams` passthrough became redundant and was removed)

## Counted tests

- `@876/projects-ui` new `it()`: **24** (floor 14 met). Full package suite: **13 files, 163 tests passed.**
  - rows render in payload order · work-item row links `${issuesBaseHref}/${issueId}` · collapse hides descendants · expand restores them · critical row + bar marked · one bar per scheduled row · actual overlay only where actuals exist · one connector per edge · day/week/month header labels and column counts · zoom control reports the choice · arrow key moves one day · shift+arrow resizes the end · week zoom moves one week · drag reschedules once with the new dates · right-edge drag resizes without moving the start · a drag that ends where it started does not reschedule · `canEdit=false` renders no handles and ignores arrow keys · empty gantt empty state · unscheduled gantt message · grid is the horizontal scroll container
- App new `it()`: **34** (floor 12 met). Full app suite: **64 files, 434 tests passed.**
  - route handlers: permission/module requirement, actor injection, `strictObject` rejects `capturedBy`, empty name 422, 403 passthrough, 404 mapping (both routes)
  - loader: reads the gantt read model, timeline failure banner suppresses the canvas, `canEdit` true/false, compares the requested baseline, falls back to the newest baseline, no comparison without baselines, baseline-list failure keeps the timeline
  - wrapper: keyboard move persists through the issue update route, failure banner without refresh, zoom switch is client-only (no write)
  - baselines: capture calls the client once and selects the new baseline, rejection banner keeps the name, list renders size + compare link, empty state, variance table, delete calls the client once, deleting the compared baseline clears the selection, read-only viewer sees no capture/delete but still sees the comparison, `formatVarianceDays` signs

## Decisions

- **`GanttRow` has no `identifier`.** The contract (`packages/projects/src/types.ts`) carries `issueId` only, so the row link is `${issuesBaseHref}/${encodeURIComponent(row.issueId)}`. This is correct against the API: `issues.service.resolveIssue` accepts an `iss_…` id as well as an identifier, so both `/issues/[issueRef]` and `PATCH /api/issues/[issueRef]` resolve it. The prop stays a base href string (never a function) so it can cross the RSC boundary.
- **Zoom is presentation-only.** The API's `zoom` query is not used; the loader fetches the whole read model with `includeSubItems: true` and the wrapper changes column width, header labels, and the keyboard/drag grid unit locally (day / week / month, 1 / 7 / 30 days). No refetch on zoom, so the grid never blanks.
- **Timeline math is UTC and deterministic.** Day/week/month columns are built from `Date.UTC`/`getUTC*` with fixed month abbreviations instead of `toLocaleDateString`, so server and browser render identically (no hydration drift) and the assertions are locale-independent. Month zoom uses calendar months (variable column width); day and week zoom are exact.
- **Grid unit = one column.** Drag deltas are `round(deltaX / columnWidth)` grid units; arrow keys move exactly one unit, shift+arrow resizes the end by one unit, clamped so the finish never precedes the start.
- **Pointer handling uses window listeners, not pointer capture.** `setPointerCapture` is absent in jsdom and unnecessary here; a `pointermove`/`pointerup`/`pointercancel` trio is attached on `pointerdown` and removed on release, and the release handler recomputes from `clientX` so a drag never fires twice (a zero-delta release fires nothing).
- **`canEdit=false` renders no handles and no interaction.** Bars keep an accessible label but render as `role="img"`; summary rows (phase/task-list) are never interactive even when editable because they own no work item — they still draw their planned sum bar.
- **Critical marking** uses the `destructive` token on both the row badge and the bar (`border-destructive`, `data-critical="true"`); no green is used anywhere for interactive chrome.
- **The `filter` sentence was read as "the host filters".** The component takes exactly the six props named in the brief — no filter prop — because nothing filters the gantt server-side (`GetGanttQuery` is `zoom`/`includeSubItems` only) and a caption that does not actually filter would mislead. Filtering/grouping stays with the host, which passes a pre-filtered `gantt`.
- **Baselines are read on the server, written from the browser.** `list`/`comparison` go through `projects.baselines.*` in the loader; capture and delete go through the new app routes so the internal key never reaches the browser. The comparison table's variance is `round(minutes / 1440)` with an explicit sign, negative meaning earlier.
- Only one baseline is compared at a time; the page selects it with `?baselineId=`, defaulting to the newest capture.

## Verification

Run with `NODE_ENV=test` — **this sandbox exports `NODE_ENV=production`**, which makes React resolve to its production build; `react-dom/test-utils` then throws `React.act is not a function` and every React test in the repo fails (163/163 in `@876/projects-ui` before any change of mine). This is environmental, not a code defect.

| Command | Result |
| ------- | ------ |
| `pnpm --filter @876/projects-ui typecheck` | pass, no output |
| `pnpm --filter @876/projects-ui test` | 13 files, 163 tests passed |
| `pnpm --filter @876/projects-app typecheck` | pass, no output |
| `pnpm --filter @876/projects-app lint` | 0 errors, 4 pre-existing warnings (`window.location.assign` in `login`, `register`, `org-switcher`, `user-menu`) |
| `pnpm --filter @876/projects-app test` | 64 files, 434 tests passed |
| `node scripts/check-app-structure.mjs` | `app-structure: OK (…, projects, …)` |
| `pnpm check:rsc-boundaries` | `RSC boundaries OK (10 apps)` |

Prettier was run over every touched file. The app suite prints one pre-existing jsdom `Not implemented: navigation to another Document` line; it does not come from any file added here (verified by running the new suites in isolation).

## Unverified items

- No browser/visual pass. Drag and resize were exercised only through synthetic pointer events in jsdom; real pointer capture, touch scrolling, and pixel alignment of the SVG connectors against live layout are unverified.
- `apps/projects` and `apps/projects-api` were not run together, so the gantt payload is exercised against fixtures shaped exactly like `ganttSchema`, not against a live service.
- The gantt page's horizontal scroll at 400 px is asserted only through the grid container's `overflow-x-auto` class, not measured.
- No `pnpm check` (repo-wide format/lint/boundaries/service-bundle) run — only the seven commands listed in the brief.
