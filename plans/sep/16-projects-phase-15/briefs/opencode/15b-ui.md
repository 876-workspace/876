# Brief 15b — projects-ui custom module components

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**` (other agents edit `apps/projects-api/**`, `packages/projects/**`, `apps/projects/**`).

## Contracts (write to `packages/projects-ui/src/custom-modules/types.ts`)
```ts
type CustomModule = { object: 'projects.custom-module'; id: string; key: string; scope: 'org' | 'project'; projectId: string | null; singularName: string; pluralName: string; icon: string; version: number; fieldCount: number; recordCount: number; updatedAt: number }
type CustomModuleStatus = { key: string; label: string; category: 'open' | 'in-progress' | 'done'; position: number }
type CustomModuleRecord = { object: 'projects.custom-module-record'; id: string; moduleId: string; projectId: string | null; title: string; statusKey: string; values: Record<string, string | string[] | number | boolean | null>; createdAt: number; updatedAt: number }
type CustomModuleWidget = { object: 'projects.dashboard-widget'; id: string; kind: 'record-count' | 'status-breakdown' | 'recent-records'; moduleId: string; title: string; position: number }
type WidgetData = { kind: 'record-count'; count: number } | { kind: 'status-breakdown'; rows: { statusKey: string; label: string; count: number }[] } | { kind: 'recent-records'; records: { id: string; title: string; statusKey: string; updatedAt: number }[] }
```

## Read budget
`packages/projects-ui/src/automation/automation-rule-list.tsx` + test, `packages/projects-ui/src/layouts/layout-renderer.tsx` (props only), `packages/projects-ui/src/reports/work-report-panel.tsx`, package.json exports.

## Deliver `packages/projects-ui/src/custom-modules/`
- `custom-module-list.tsx` (name link via `hrefBase`, scope, fields, records, updated)
- `status-editor.tsx` (client; rows key/label/category, add/remove/reorder; serializes to hidden `statuses` JSON input)
- `record-list.tsx` (title tier 1 via `hrefBase`, status badge coloured by category, up to 4 `columns: { fieldKey, label }[]` values, em dash for empty)
- `record-status-badge.tsx`
- `record-summary.tsx` (status + field values given `fields: { fieldKey, label }[]`)
- `dashboard-widget.tsx` (renders `WidgetData` by kind; bars as plain divs)
- Explicit subpath exports `./custom-modules/<name>`.
- Tests beside each, floor **45 `it()`**.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-15/reports/opencode/15b-ui.md`.
