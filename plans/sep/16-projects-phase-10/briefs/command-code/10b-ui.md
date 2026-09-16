# Brief 10b — projects-ui report components

Repo `/root/projects/876`. You write code; do NOT commit/branch/push. Another agent edits `apps/projects-api/**` and `packages/projects/**` at the same time — do not touch those or `apps/projects/**`.

## Contracts
Copy the TypeScript types from `plans/sep/16-projects-phase-10/plan.md` section 5 **verbatim** into `packages/projects-ui/src/reports/types.ts` (the client package will export the same shapes later; the app adapts).

## Read budget
1. `packages/projects-ui/src/finance/financial-summary-panel.tsx` + its test (style, props, vitest env)
2. `packages/projects-ui/src/finance/format-money.ts`
3. `packages/projects-ui/src/time-tracking.tsx` (`formatDuration`)
4. `packages/projects-ui/package.json` exports block
Then write.

## Deliver (`packages/projects-ui/src/reports/`)
- `work-report-panel.tsx` — totals, overdue, three count breakdowns as horizontal bars (plain divs with width %, no chart lib).
- `project-health-table.tsx` — health `Badge` (on-track uses status green badge; never a green button), progress, overdue, budget consumed; `projectHrefBase: string` prop.
- `time-report-table.tsx` — billable/non-billable/total columns, `tabular-nums`, totals footer.
- `budget-variance-table.tsx` — money via `format-money`, negative variance marked `text-destructive`, null → em dash.
- `workload-table.tsx` — utilisation %, null → "No capacity", > 100% flagged.
- `report-period-nav.tsx` — client component rendering prev/next/this-month `Link`s from `basePath: string`, `from`, `to` (no function props).
- `csv-export-link.tsx` — plain anchor to a `href: string` with `download`.
- Empty states short; no descriptive paragraphs. Table cell tiers per `.claude/rules/app-layout.md` §12.
- Subpath exports `./reports/*` in package.json.
- Tests beside each; floor **35 `it()`**.

## Verify (one at a time)
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-10/reports/command-code/10b-ui.md`: files, counted tests, verification output, unverified items.
