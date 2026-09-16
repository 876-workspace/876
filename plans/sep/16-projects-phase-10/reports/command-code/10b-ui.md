# Brief 10b — `@876/projects-ui`: report components

- Branch: `feature/projects-phase-10-reports`
- Scope: `packages/projects-ui/**` only. Nothing under `apps/**` or `packages/projects/**` was opened or edited — the four `apps/projects-api` files and `packages/projects` are the other agent's lane and are untouched.
- Built against plan.md §5 contracts exactly; no schema or contract change was proposed from this lane.

## Files

### Contracts

- `src/reports/types.ts` — `ReportPeriod`, `CountRow`, `WorkReport`, `ProjectHealthRow`, `HealthReport`, `TimeReportRow`, `TimeReport`, `BudgetVarianceRow`, `BudgetVarianceReport`, `WorkloadRow`, `WorkloadReport`, copied shape-for-shape from plan.md §5 (the only change is that each declaration is `export`ed and the file is prettier-wrapped; no field name, type, optionality, or union member differs).

### Components (each exported as its own subpath)

| File                        | Export                | Props                                                                     |
| --------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `work-report-panel.tsx`     | `WorkReportPanel`     | `{ report: WorkReport }`                                                  |
| `project-health-table.tsx`  | `ProjectHealthTable`  | `{ report: HealthReport; projectHrefBase: string }`                       |
| `time-report-table.tsx`     | `TimeReportTable`     | `{ report: TimeReport }`                                                  |
| `budget-variance-table.tsx` | `BudgetVarianceTable` | `{ report: BudgetVarianceReport }`                                        |
| `workload-table.tsx`        | `WorkloadTable`       | `{ report: WorkloadReport }`                                              |
| `report-period-nav.tsx`     | `ReportPeriodNav`     | `{ basePath: string; from: number; to: number }`                          |
| `csv-export-link.tsx`       | `CsvExportLink`       | `{ href: string; download?: string; label?: string; className?: string }` |

Only `report-period-nav.tsx` carries `'use client'` (it reads the current date to build the "This month" period). The other six are presentation-only, so an app server component can render them directly.

### Edited

- `package.json` — eight `./reports/…` subpath entries (`types` + `default` pair each), appended after the `./finance/…` block. Diff is +33 lines, nothing else.

## Counted tests

New `it()` in `@876/projects-ui`: **45** (floor 35). Full package suite: **29 files, 314 tests passed** (269 pre-existing + 45 new).

| File                                         | `it()` |
| -------------------------------------------- | ------ |
| `src/reports/work-report-panel.test.tsx`     | 7      |
| `src/reports/project-health-table.test.tsx`  | 9      |
| `src/reports/time-report-table.test.tsx`     | 6      |
| `src/reports/budget-variance-table.test.tsx` | 8      |
| `src/reports/workload-table.test.tsx`        | 7      |
| `src/reports/report-period-nav.test.tsx`     | 5      |
| `src/reports/csv-export-link.test.tsx`       | 3      |
| **total**                                    | **45** |

What they prove:

- **work-report-panel (7)** — total and overdue stats · a non-zero overdue count is `text-destructive` and a zero one is not · the three breakdowns (by state / by type / by assignee) render · each bar is scaled against the largest count **in its own breakdown** (`data-count-bar` → `width: 100% / 50% / 25%` for 8 / 4 / 2) · a breakdown with no rows shows the short "No items" line · `total === 0` renders the empty state and **no** breakdown headings.
- **project-health-table (9)** — project name links to `${projectHrefBase}/${encodeURIComponent(projectId)}` (encoding asserted with `prj/one two` → `prj%2Fone%20two`) · on-track renders the green **status badge** and is not inside an `a`/`button` · at-risk is `text-warning`, off-track `text-destructive` · `unknown` renders a neutral "Unknown" badge · progress and budget percentages render · `null` progress and `null` budget render em dashes · overdue > 0 and budget > 100% are flagged · the empty state.
- **time-report-table (6)** — billable / non-billable / total per row from minutes (`90 + 30` → `1h 30m`, `30m`, `2h`) · `0m` for zero · the totals footer sums every row (`2h 15m`, `30m`, `2h 45m`) · the first column heading follows `groupBy` (`user` → "Member") · the label is the tier-1 cell · the empty state renders and **no footer** is emitted.
- **budget-variance-table (8)** — `formatMoney` output for budget / actual / variance · a negative variance (`-25000`) is `text-destructive` and a positive one is not · `null` budget → em dash · `currency: null` → all three money cells em dash · `formatDuration` hours (`10h`, `12h 30m`) · `null` budget hours → em dash · the empty state.
- **workload-table (7)** — utilisation percent · `null` utilisation → "No capacity" in muted text (never 0 or 100) · `133%` is flagged `text-destructive` · planned / logged / capacity durations · `null` capacity minutes → em dash · the member name is the tier-1 cell · the empty state.
- **report-period-nav (5)** — the period renders as an inclusive range (`Sep 1, 2026 – Sep 30, 2026` from an exclusive `to`) · Previous is an equal-length span shifted back · Next is an equal-length span shifted forward · "This month" is the current UTC month (fake system time `2026-09-16`) · an existing query string in `basePath` is preserved (`?tab=time&from=…&to=…`).
- **csv-export-link (3)** — an anchor pointing at `href` · a `download` attribute is present by default · custom label, filename, and class are applied.

## Decisions

1. **Contracts are the plan's §5 block, verbatim.** The file is data-types-only, imports nothing, and is the single place the app maps its client-package resources into. When `packages/projects` exports the same shapes (10a), the app can assign them structurally; the duplication is deliberate for this phase and is the one thing to delete if the client package ever exports the report resources themselves.
2. **Explicit `./reports/<name>` entries rather than a `./reports/*` wildcard.** A literal wildcard mapping (`"./reports/*": "./src/reports/*.ts"`) cannot resolve the `.tsx` files: TypeScript substitutes the pattern literally and looks for `work-report-panel.ts`, which does not exist, so every consumer import would fail typecheck. Eight explicit entries (matching the existing `./finance/…` style) give the same subpath surface and resolve under both TS and the bundlers.
3. **Health reuse, not a second badge.** `ProjectHealthBadge` (already in `status-badges.tsx`) renders on-track / at-risk / off-track; the table narrows the report's wider union and renders `unknown` as a `secondary` badge. Health is a `<Badge>` in a cell — there is no green control anywhere (§9), and the test asserts the badge is not a descendant of an `a` or `button`.
4. **Flag styling lives on a nested element with a static class string.** The first draft concatenated classes inside a template literal (`tabular-nums${cond ? ' font-medium text-destructive' : ''}`); `prettier-plugin-tailwindcss` rewrote those expressions into `tabular-numstext-destructive` — it strips the leading space when it sorts the conditional classes, silently merging two class names into one that matches nothing. Every flag is now a `<span className={cond ? 'font-medium text-destructive' : undefined}>` inside the cell, with the cell's own classes static. **This is a repo-wide hazard, not a reports-only one** — any `${…}` class concatenation in a `className` template literal is at risk the next time someone runs `prettier --write`.
5. **Formatting helpers are imported, never re-implemented.** Durations use `formatDuration` from `../time-tracking`, money uses `formatMoney` from `../finance/format-money`. `formatMoneyOrUnpriced` is deliberately not used: the brief asks for an em dash on a null amount, and "Unpriced" is reserved for a null rate.
6. **`null` money makes the whole cell an em dash, not a zero.** A row with `currency: null` cannot be priced at all, so budget, actual, and variance all render `—`; a row with a currency but a null `varianceMinor` renders `—` for the variance only.
7. **Numbers and money are right-aligned with `tabular-nums`; each row has exactly one tier-1 cell** (§12): the project/group/member name (a link only in the health table, in the package's existing sky-link style), with counts, durations, and percentages as tier 2 and em dashes / "No capacity" muted.
8. **Empty states are one line each.** `Empty` + `EmptyTitle` ("No items in this period", "No projects to report", "No time logged", "No budgets to compare", "No assigned work") and a per-breakdown "No items" line — no descriptive paragraph anywhere, per the brief. The time table also suppresses its totals footer when there are no rows, so an empty report does not render `0m / 0m / 0m`.
9. **The period nav is data-in, data-out.** It takes `basePath`/`from`/`to` and renders three `next/link` anchors plus the readable range; no callbacks, so it stays serializable across the RSC boundary. "This month" is the UTC calendar month (`Date.UTC`) rather than a local one, so a server render and a browser render on the same day agree except within a few hours of a month boundary.
10. **The CSV link is a plain `<a download>`.** No client boundary, no fetch, no `next/link`: the browser handles the download, and the API's `?format=csv` response is never re-fetched by the component.

## Verification

| Command                                                                      | Result                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm --filter @876/projects-ui typecheck`                                   | pass, exit 0, no output                                              |
| `NODE_ENV=test pnpm --filter @876/projects-ui test`                          | **29 files, 314 tests passed** (269 pre-existing + 45 new)           |
| `NODE_ENV=test pnpm exec vitest run src/reports` (in `packages/projects-ui`) | **7 files, 45 tests passed**                                         |
| `pnpm exec eslint packages/projects-ui/src/reports`                          | exit 0, no findings (only the next plugin's pages-directory warning) |
| `pnpm exec prettier --write` on the 15 new files + `package.json`            | all formatted, re-run clean                                          |
| `node scripts/check-rsc-boundaries.mjs`                                      | `RSC boundaries OK (10 apps).`                                       |

```
$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit
exit=0

$ NODE_ENV=test pnpm --filter @876/projects-ui test
 Test Files  29 passed (29)
      Tests  314 passed (314)

$ NODE_ENV=test pnpm exec vitest run src/reports
 Test Files  7 passed (7)
      Tests  45 passed (45)
```

**`NODE_ENV=production` in this shell.** Without the override, every React render test in the repo — including pre-existing files such as `src/finance/financial-summary-panel.test.tsx`, which fails 6/6 — dies with `React.act is not a function`, because react-dom resolves to its production build, which has no `act`. All runs above were made with `NODE_ENV=test`. Environmental, not a code defect; the same note appears in the phase-5, phase-7, and phase-8 reports.

**No `lint` script for this package** (`pnpm --filter @876/projects-ui lint` fails before this brief as well). ESLint run directly over the new directory exits 0; the rest of the package still carries the two pre-existing errors this brief did not touch (`issue-comments.tsx`, `project-detail.tsx`).

My footprint: `packages/projects-ui/package.json` (modified) and `packages/projects-ui/src/reports/` (new). No commit, no branch, no push. No `eslint-disable`, `as any`, or `@ts-ignore`. No data fetching, session, `fetch`, or router import in any new file; no chart library — the bars are two nested `div`s with an inline `width` percentage.

## Unverified items

- **No live render against real API payloads.** Everything was verified against locally declared fixtures typed by the §5 contracts. If 10a's actual JSON differs by even one field (a `count` as a string, a missing `currency`, `progressPercent` as a 0–1 ratio rather than 0–100), the app-side mapping is where it has to be bridged — these components do not coerce.
- **No browser or visual pass.** Bar proportionality, the three-up breakdown grid at narrow widths, table `overflow-x-auto` behaviour, and column alignment at 400 px were reasoned about from the shared primitives, not measured in a browser.
- **No hydration test for `ReportPeriodNav`.** The client/server date agreement is reasoned about (UTC month, `Date.UTC`), not proven through `renderToString` + `hydrateRoot`, and a render in the first hours of a month in a non-UTC timezone can produce a different "This month" on the two sides.
- **The CSV href is assumed, not exercised.** `CsvExportLink` renders whatever `href` the app builds; the API's RFC 4180 quoting and formula-injection guard are 10a's to prove, and no download was performed.
- **`projectHrefBase` is assumed to be a bare base.** The component trims one trailing slash and appends the encoded id; if the app's route is parameterised differently (`/projects?open=`), nothing here catches it.
- **The `unknown` health path is only covered by the component test.** Whether 10a ever emits `unknown` (its rule says "no open items and no budget") was not verified against the API.
