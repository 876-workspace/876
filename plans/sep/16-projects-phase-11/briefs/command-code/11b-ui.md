# Brief 11b — projects-ui template components

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**` (another agent edits `apps/projects-api/**` and `packages/projects/**`).

## Contracts
Copy `ProjectTemplate` and `TemplatePreview` verbatim from `plans/sep/16-projects-phase-11/plan.md` into `packages/projects-ui/src/templates/types.ts`.

## Read budget
`packages/projects-ui/src/reports/project-health-table.tsx` + test, `packages/projects-ui/src/reports/report-period-nav.tsx`, `packages/projects-ui/package.json` exports. Then write.

## Deliver `packages/projects-ui/src/templates/`
- `template-list.tsx` — table: name (tier 1, link via `hrefBase: string`), key (muted), version, counts, updated; mobile rows; empty state title only.
- `template-summary.tsx` — detail header facts + counts.
- `template-preview-table.tsx` — phases then work items with computed start/due dates (em dash for null), and a destructive-tone notice listing `missing` keys when any.
- `instantiate-options.tsx` — client checkbox group for includeWorkItems/includeDependencies/includeBudgets using controlled `name` inputs only (form-friendly, no function props required; accept optional `defaultValues`).
- Explicit subpath exports `./templates/<name>` in package.json.
- Tests beside each; floor **30 `it()`**.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-11/reports/command-code/11b-ui.md`.
