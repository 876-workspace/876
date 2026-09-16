# Brief 10c — Projects app: reports, dashboard, capacity

- Branch: `feature/projects-phase-10-reports`
- Scope: `apps/projects/**` only. Every console file the other lane has open (`apps/console/**`) was left untouched; nothing under `packages/**` or `apps/projects-api/**` was edited.
- Built against plan.md §5 contracts and the 10a client resources (`reports.work|health|time|budgetVariance|workload`, `capacity.list|create|update|delete`) and the 10b components (`@876/projects-ui/reports/*`). No contract change was proposed from this lane.
- No `eslint-disable`, `as any`, or `@ts-ignore`. No commit, branch, or push.

## Files

### New — routes (one explicit handler per report; no generic `[report]` gateway)

| File                                           | Handler | Guard           | Answers                                                                                   |
| ---------------------------------------------- | ------- | --------------- | ----------------------------------------------------------------------------------------- |
| `src/app/api/reports/work/route.ts`            | GET     | `projects.view` | JSON report, or `text/csv` download                                                       |
| `src/app/api/reports/health/route.ts`          | GET     | `projects.view` | JSON report, or `text/csv` download                                                       |
| `src/app/api/reports/time/route.ts`            | GET     | `projects.view` | JSON report (`?groupBy=`), or `text/csv`                                                  |
| `src/app/api/reports/budget-variance/route.ts` | GET     | `projects.view` | JSON report, or `text/csv` download                                                       |
| `src/app/api/reports/workload/route.ts`        | GET     | `projects.view` | JSON report, or `text/csv` download                                                       |
| `src/app/api/capacity/route.ts`                | GET     | `projects.view` | capacity list (`?userId=`)                                                                |
| `src/app/api/capacity/route.ts`                | POST    | `projects.edit` | 201 + created capacity                                                                    |
| `src/app/api/capacity/[capacityId]/route.ts`   | PATCH   | `projects.edit` | 200 + updated capacity                                                                    |
| `src/app/api/_lib/reporting-api.ts`            | —       | —               | shared: code→status map, `serviceFailure`, `csvDownload`, query schemas, `searchParamsOf` |

### New — pages

| File                                                         | Contents                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/app/(app)/reports/page.tsx`                             | Dashboard: period nav, report links, health table, work panel — two independent `<Suspense>` regions   |
| `src/app/(app)/reports/work/page.tsx`                        | `ReportPeriodNav`, CSV link, `WorkReportData`                                                          |
| `src/app/(app)/reports/time/page.tsx`                        | Period nav (grouping preserved), CSV link, group-by links (`project`/`user`/`issue`), `TimeReportData` |
| `src/app/(app)/reports/budget-variance/page.tsx`             | Period nav, CSV link, `BudgetVarianceData`                                                             |
| `src/app/(app)/reports/workload/page.tsx`                    | Period nav, CSV link, `WorkloadReportData`                                                             |
| `src/app/(app)/settings/capacity/page.tsx`                   | Capacity list + Add, `DataTableSkeleton` fallback                                                      |
| `src/app/(app)/settings/capacity/new/page.tsx`               | Create form                                                                                            |
| `src/app/(app)/settings/capacity/[capacityId]/edit/page.tsx` | Edit form                                                                                              |

Every page: container `px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `ResourceToolbar` without `description`, `metadata` title, guard `requireAppAccess({ module: 'projects', permission: … })` (`projects.view` for reports, `projects.edit` for capacity), `<Suspense>` + `DataTableSkeleton` (tables) or a `876-card … animate-pulse` block (work panel, forms).

### New — app feature code

- `src/features/reports/report-query.ts` — `REPORT_GROUPS`/`parseReportGroup`/`reportGroupLabel`, `REPORT_LINKS`, `reportHref`, `csvExportHref` (builds `/api/reports/<slug>?…&format=csv`).
- `src/features/reports/capacity-input.ts` — `MAX_MINUTES_PER_WEEK` (10 080), `parseHoursToMinutes`, `formatMinutesAsHours`, `parseDateInput`, `formatDateInput`.
- `src/features/reports/capacity-members.ts` — `toMemberOptions(labels)`.
- `src/features/reports/components/` — `work-report-data.tsx`, `health-report-data.tsx`, `time-report-data.tsx`, `budget-variance-data.tsx`, `workload-data.tsx`, `report-links.tsx`, `report-skeleton-columns.ts` (4 table column sets + capacity), `capacity-list-data.tsx`, `capacity-table.tsx`, `new-capacity-data.tsx`, `edit-capacity-data.tsx`, `capacity-form.tsx` (the only `'use client'` file).
- `src/lib/client/reports.ts` — `reportsClient.createCapacity` / `updateCapacity`, the only browser-side capacity mutation path.
- `src/lib/period.ts` (+ `period.test.ts`) — the `?from&to` resolver, moved out of `features/finance/` (see decision 1).

### Edited

- `src/lib/services/projects.ts` — two getters, `reports` and `capacity`, on the server-only service client.
- `src/components/shell/nav-config.ts` — Reports entry `/reports` (`projects` module + `projects.view`), placed after Time.
- `src/components/shell/nav-icons.tsx` — `reports: ChartBarIcon`.
- `src/app/(app)/settings/_lib/settings-nav.ts` — Capacity under Organization, `href: '/settings/capacity'`.
- `src/components/shell/nav-config.test.ts`, `(app)/settings/_lib/settings-nav.test.ts` — the two inventory expectations updated for the new entries; every binding assertion in those files is unchanged and still passes.
- `src/app/(app)/projects/[projectId]/finance/page.tsx`, `src/features/finance/components/finance-data.tsx` — import the moved period module (`period.ts` deleted from `features/finance/`, `FinancePeriod` renamed `ReportPeriod`).
- `src/features/finance/components/finance-data.tsx` also picked up one prettier fix on an unrelated line (a `??` chain prettier parenthesises); the HEAD version of that file already failed `prettier --check`, so this is a move toward the repo standard, not a cosmetic aside I invented.

## Counted tests

New `it()` in `@876/projects-app`: **117** (floor 40), across 21 files — `vitest run` reports `Test Files 21 passed (21) / Tests 117 passed (117)` for `src/features/reports src/app/api/reports src/app/api/capacity`. Plus the 6 period tests that moved with `src/lib/period.test.ts` (unchanged assertions, new path).

| File                                                        | `it()` | What it proves                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/reports/work/route.test.ts`                        | 9      | guard · period + `projectId` passed through · 422 for a period that does not move forward · 422 for a fractional period · 422 for `format=pdf` · csv branch asserts `format: 'csv'` is passed down, `text/csv; charset=utf-8`, `attachment; filename="work-report.csv"`, body · 404 for `project-not-found` · 401 without touching the service                  |
| `app/api/reports/health/route.test.ts`                      | 6      | guard · JSON envelope · csv download headers + filename · 422 for an unknown format · 503 for `projects/not-configured` · 401                                                                                                                                                                                                                                   |
| `app/api/reports/time/route.test.ts`                        | 7      | guard · `groupBy=user` passed through · defaults to `project` · 422 for `groupBy=team` · csv with `groupBy=issue` · 422 for `invalid-period` · 401                                                                                                                                                                                                              |
| `app/api/reports/budget-variance/route.test.ts`             | 6      | guard · JSON · 422 (`to === from`) · csv headers · unmapped code → 400 with the `error/bad-request` envelope · 401                                                                                                                                                                                                                                              |
| `app/api/reports/workload/route.test.ts`                    | 6      | guard · JSON · 422 for an unknown query key (strict schema) · csv headers · 404 · 401                                                                                                                                                                                                                                                                           |
| `app/api/capacity/route.test.ts`                            | 12     | GET guard (`projects.view`) · list envelope · `?userId=` narrowing · 422 unknown query key · GET 401 · POST guard (`projects.edit`) · 201 with integer minutes · 422 for a payload naming its own tenant · 422 fractional minutes · 422 above 10 080 · 409 `capacity-overlap` · POST 401                                                                        |
| `app/api/capacity/[capacityId]/route.test.ts`               | 8      | guard · update args + envelope · decodes `cap%2Fone%20two` · 422 empty body · 422 for a body naming `userId` · 422 above 10 080 · 404 `capacity-not-found` with envelope · 401                                                                                                                                                                                  |
| `features/reports/report-query.test.ts`                     | 9      | group parsing + fallback · group labels · `reportHref` with and without a grouping · the link inventory · `csvExportHref` with period / grouping / neither                                                                                                                                                                                                      |
| `features/reports/capacity-input.test.ts`                   | 15     | whole, half, and quarter hours → minutes (`40→2400`, `37.5→2250`, `0.05→3`) · rejects `37.33` and `1.01` (not whole minutes) · rejects blank/zero/negative/non-numeric · 168 h accepted, 168.5 h rejected · whitespace · formatting back (`40`, `37.5`, `37.25`, `''` for null) · round-trip · date input parsing incl. `2026-13-40` rejected · date formatting |
| `features/reports/capacity-members.test.ts`                 | 2      | options sorted by name · empty directory                                                                                                                                                                                                                                                                                                                        |
| `features/reports/components/work-report-data.test.tsx`     | 3      | period passed to the service · breakdowns render · banner + no panel on failure                                                                                                                                                                                                                                                                                 |
| `features/reports/components/health-report-data.test.tsx`   | 3      | org-scoped read · project links to `/projects/prj_1` · banner keeps the page mounted                                                                                                                                                                                                                                                                            |
| `features/reports/components/time-report-data.test.tsx`     | 3      | `groupBy` passed through · grouped row renders (`1h 30m`) · banner                                                                                                                                                                                                                                                                                              |
| `features/reports/components/budget-variance-data.test.tsx` | 3      | period · money renders (`-$250.00`) · banner                                                                                                                                                                                                                                                                                                                    |
| `features/reports/components/workload-data.test.tsx`        | 3      | period · `null` capacity renders "No capacity" (never 0 %) · banner                                                                                                                                                                                                                                                                                             |
| `features/reports/components/report-links.test.tsx`         | 3      | links carry the period · current report is text with `aria-current`, not a link · dashboard offers all four                                                                                                                                                                                                                                                     |
| `features/reports/components/capacity-table.test.tsx`       | 4      | `2250` → `37.5h` · open-ended window renders `—` · edit link · empty state                                                                                                                                                                                                                                                                                      |
| `features/reports/components/capacity-list-data.test.tsx`   | 4      | member labels · falls back to the raw user id · directory failure banners but keeps rows · capacity failure banners and keeps an empty table                                                                                                                                                                                                                    |
| `features/reports/components/new-capacity-data.test.tsx`    | 2      | member options in name order · directory failure banners and the form still renders                                                                                                                                                                                                                                                                             |
| `features/reports/components/edit-capacity-data.test.tsx`   | 4      | prefills hours + `2026-09-01` + member name · `cap%5F1` decodes · missing record → `notFound()` · list failure banners without `notFound()`                                                                                                                                                                                                                     |
| `features/reports/components/capacity-form.test.tsx`        | 5      | `37.5` h → `minutesPerWeek: 2250` and `router.push('/settings/capacity')` · `37.33` refused with its message and no request · member required first · edit mode updates `cap_1` and asks for no member · service failure surfaced without navigating                                                                                                            |

## Decisions

1. **The period resolver moved to `src/lib/period.ts`, not `features/reports/period.ts`.** The brief allowed a move to `features/reports/` "only if nothing else breaks". It does break something: `eslint.app-structure.mjs` bans `@/features/*` imports from inside `features/**` for every app that loads it ("move the shared piece to `components/patterns/` or `src/lib/`"), so either direction — finance importing reports, or reports importing finance — is a cross-feature import. `src/lib/` is the home that rule names, so the module (and its 6 tests) went there, `FinancePeriod` was renamed `ReportPeriod`, and the two finance call sites now import `@/lib/period`. Fallback behaviour, function names, and signatures are byte-identical to the version the finance page used.
2. **Five explicit route files, no gateway.** `app/api/reports/[report]/route.ts` is forbidden by the brief and would also be the only way to serve a request whose validation differs per report (`health` takes no period; `time` requires a grouping). The duplication is the `format === 'csv'` branch, and it is the price of per-report zod schemas, per-report filenames, and `projects.view` on each route individually.
3. **CSV is a pass-through, and JSON is the default.** `?format=csv` forwards `format: 'csv'` to the service and re-serves the service's text with `content-type: text/csv; charset=utf-8` and `content-disposition: attachment; filename="<report>-report.csv"`. Without it the route returns the same report in the `{ data, error }` envelope, so the endpoint is also a usable JSON report URL. The API's own CSV response sets only `content-type`; the attachment disposition belongs to the app because the app is what the browser downloads from.
4. **Status mapping lives in one `app/api/_lib/` table.** `projects/tenant-not-found|project-not-found|capacity-not-found` → 404, `capacity-overlap` → 409, `invalid-period|invalid-request` → 422, `not-configured` → 503, anything else → 400 — the same shape as the existing `api/_lib/time-error-status.ts`. Following the app's existing routes, the _envelope code_ is the registry's status-derived code (`apiJson` derives it), not the service's internal code; the tests assert both the status and the envelope.
5. **Capacity reads are `projects.view`; every write is `projects.edit`.** The capacity pages themselves require `projects.edit`, because a read-only visitor has nothing to do on a page whose only verb is "set someone's week". The API GET stays at `projects.view` so a reading caller is not forced through the write permission.
6. **Hours are parsed with integer maths only.** `37.5` → `2250`, `37.33` → rejected (it is not a whole number of minutes), `> 168` → rejected. `formatMinutesAsHours` renders the value back for the edit form; a value the service holds that is not representable (say 100 minutes) prefills as `1.67` and will be refused on submit rather than silently rounded.
7. **The form's member picker is a `NativeSelect`, not the existing `MemberPicker`.** `MemberPicker` is a combobox built for issue assignment; capacity is a small, alphabetical list of all members loaded once, and a native select needs no client combobox, no pointer-capture stubs, and no popup interaction in tests. `toMemberOptions` sorts it by name so the list reads consistently.
8. **Capacity edit loads by listing, because the client package has no per-id retrieve.** `EditCapacityData` lists capacity and finds the id; a missing id with no service error is `notFound()`, a service error is a banner (an outage is not a 404). The alternative would have been inventing a `capacity.retrieve` method in the package lane.
9. **Capacity is registered in the settings hub.** The brief asked only for the Reports rail entry, but shipping `src/app/(app)/settings/capacity/page.tsx` without an entry would leave the hub silently incomplete. Its inventory test (`settings-nav.test.ts`) was updated with `'/settings/capacity'`; every invariant assertion in that file is untouched.
10. **Not every region is a table fallback.** Table regions use `DataTableSkeleton` with column sets matching the loaded tables (`timeReportSkeletonColumns(groupBy)` follows the chosen grouping, since the skeleton header must not lie). The work panel and the two capacity forms use a neutral `876-card … animate-pulse` block, matching the finance forms — a skeleton table would be the wrong shape for them.
11. **No loading.tsx anywhere in `/reports`.** `check-app-structure.mjs` fails a page-shaped fallback that covers child routes, and `/reports` has four children; each leaf owns its `<Suspense>` instead.

## Verification

| Command                                                         | Result                                                                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @876/projects-app typecheck`                     | exit 0, no output                                                                                                                                                                                       |
| `pnpm --filter @876/projects-app lint`                          | exit 0 — 0 errors, 4 pre-existing warnings (`login/_components/embedded-auth.tsx`, `register/_components/registration-auth.tsx`, `components/shell/org-switcher.tsx`, `components/shell/user-menu.tsx`) |
| `pnpm --filter @876/projects-app test`                          | **145 files, 1048 tests passed**                                                                                                                                                                        |
| `node scripts/check-app-structure.mjs projects`                 | `app-structure: OK (projects)`                                                                                                                                                                          |
| `pnpm check:rsc-boundaries`                                     | `RSC boundaries OK (10 apps).`                                                                                                                                                                          |
| `pnpm exec prettier --check` over every file this brief touched | `All matched files use Prettier code style!`                                                                                                                                                            |

```
$ pnpm --filter @876/projects-app typecheck
$ tsc --noEmit
exit=0

$ pnpm --filter @876/projects-app lint
✖ 4 problems (0 errors, 4 warnings)
lint-exit=0

$ NODE_ENV=test pnpm --filter @876/projects-app test
 Test Files  145 passed (145)
      Tests  1048 passed (1048)

$ NODE_ENV=test pnpm exec vitest run src/features/reports src/app/api/reports src/app/api/capacity
 Test Files  21 passed (21)
      Tests  117 passed (117)

$ node scripts/check-app-structure.mjs projects
app-structure: OK (projects)

$ pnpm check:rsc-boundaries
RSC boundaries OK (10 apps).
```

**`NODE_ENV=production` in this shell.** The first full run failed 310 tests across 58 files with `React.act is not a function` — including pre-existing files such as `settings/users/[membershipId]/permissions/page.test.tsx` — because react-dom resolves to its production build, which has no `act`. Every run above was made with `NODE_ENV=test`. Environmental, not a code defect; the same note appears in the phase-5, 10b, and 10c-adjacent reports.

**`pnpm check` (repo-wide) was not run.** The brief names five commands; `pnpm check` would also lint and test every app, including the console files the other lane has open. The five were run individually and all pass.

## Unverified items

- **No live API round-trip.** Every app route was exercised against a mocked service result typed by the client package; no request was made to a running `apps/projects-api`. If 10a's serialized report differs by a field — `utilisationPercent` as a 0–1 ratio, `budgetMinor` as a number rather than a string, `minutesPerWeek` as hours rather than minutes — the failure will surface at the `projects-ui` boundary, which does not coerce.
- **No browser pass.** Layout at narrow widths, the four-column period-nav + CSV-link row wrapping, the group-by link row, and the actual file download were reasoned from the primitives, not observed. In particular no CSV was downloaded end to end: the headers are asserted at the route boundary and the API's RFC 4180 quoting and formula-injection guard remain 10a's to prove.
- **The `capacity-overlap` 409 path is only tested against a mocked code.** Whether the real service raises it on a create that overlaps an existing window, and whether it names the conflicting row, was not verified.
- **Capacity edit loads the whole list.** Correct for a small directory, unmeasured for a tenant with many capacity rows; there is no per-id retrieve in `packages/projects` to switch to.
- **No page-level render test.** The pages are covered indirectly — through their loaders, and through `nav-config.test.ts`, which binds `/reports` to the permission its page source actually guards on (that test reads the route file from disk and passes). Nothing asserts the composed page HTML, the `Suspense` fallback selection, or that the two dashboard regions stream independently.
- **`ReportPeriodNav`'s client/server date agreement** is 10b's caveat and carries over: the dashboard and the four report pages pass `from`/`to` from the server, but "This month" is computed in the client component.
