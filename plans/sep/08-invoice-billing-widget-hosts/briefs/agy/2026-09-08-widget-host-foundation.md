# Delegated implementation: Invoice and Billing widget host foundation

Implement Phase 1 of shared widget hosting. Work directly in the current
working tree. Do not create a branch, commit, push, or open a pull request.

Read these repository instructions before editing:

- `AGENTS.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/performance.md` and the bundle-size, rerender, and rendering
  files it routes to
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/feature-flags.md`
- `.agents/rules/naming.md`
- `.claude/rules/cli.md`
- `.claude/rules/git.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

## Goal

Make `@876/widgets` the owner of host support and feature-dependency resolution,
refactor Billing away from app-local Notepad knowledge, and make Invoice a
widget-capable host with an empty enabled list. Add no Work widget or Work UI.

## Required implementation

1. In `packages/widgets/src/catalog.ts` and `packages/widgets/src/index.ts`:
   - Add `'invoice'` to `WidgetHost` and map it to app slug `876-invoice`.
   - Do not add Invoice to Notepad or Chat `supportedHosts`, `implementedHosts`,
     or app feature maps. No widget is implemented for Invoice in this phase.
   - Export a catalog-derived `WidgetId` type.
   - Add and export
     `resolveEnabledWidgetIds(host, enabledFeatureSlugs): WidgetId[]`.
   - Resolution must iterate the canonical shared `widgetCatalog`; require the
     host to appear in both `supportedHosts` and `implementedHosts`; and require
     `isWidgetEnabled` to satisfy the full metadata-owned feature chain.
   - Make `isWidgetEnabled` itself fail closed for unsupported or unimplemented
     hosts, so direct callers cannot enable unfinished host integrations.
   - Preserve the explicit legacy feature alias behavior.

2. In `packages/widgets/src/notepad.test.ts`:
   - Assert the Invoice host/app-slug contract.
   - Assert the resolver returns Billing Notepad and Chat in catalog order when
     all required gates exist.
   - Assert missing masters/children fail closed.
   - Assert Invoice returns `[]`, including when `invoice-widgets` is present,
     because no widget metadata is implemented there.

3. In `packages/widgets/src/react/widget-popout.tsx`,
   `packages/widgets/src/react/widget-dock.tsx`, and focused tests:
   - Add item-specific numeric panel width support to `WidgetPopout.Panel`
     without breaking existing `size`, `sizeByItem`, or `defaultWidth` callers.
     A clear prop such as `widthByItem?: Partial<Record<string, number>>` is
     preferred. Item-specific numeric width should take precedence for the
     active item.
   - Make `SharedWidgetDock` derive the width map from each registered
     renderer's `metadata.defaultPanel.width`; remove its hard-coded effective
     `md` width dependency.
   - Add regression coverage proving active items can select their numeric
     metadata width. Do not weaken existing popout behavior.
   - Keep Chat's current separate secondary rail and the `chatEnabled` prop.

4. In Billing (`apps/billing/src/types/features.ts`,
   `apps/billing/src/lib/features.ts`, `apps/billing/src/lib/features.test.ts`,
   and `apps/billing/src/components/shell/shell.tsx`):
   - Replace `widgets: { notepad: boolean }` with
     `widgets: { enabledWidgetIds: WidgetId[] }`, importing the shared type in
     the shared app type module.
   - Resolve the IDs once with the shared helper from the evaluated slug set.
   - Preserve `uiFeatures.chat`; derive it from whether the resolved IDs contain
     `chatWidgetMetadata.id`, rather than evaluating Chat independently.
   - Pass the generic enabled IDs to `SharedWidgetDock`. The dock's renderer
     registry will ignore Chat as a panel ID while `chatEnabled` keeps its
     existing rail behavior.
   - Preserve fail-closed defaults and update complete-shape assertions.
   - Billing Notepad must appear only with all four platform/app gates, and
     Chat behavior must remain unchanged.

5. In Invoice (`apps/invoice/package.json`, lockfile as produced by pnpm,
   `apps/invoice/src/types/features.ts`, `apps/invoice/src/lib/features.ts`,
   `apps/invoice/src/lib/features.test.ts`, and
   `apps/invoice/src/components/shell/shell.tsx`):
   - Add `@876/widgets: workspace:*` using pnpm-compatible workspace metadata.
   - Add `widgets: { enabledWidgetIds: WidgetId[] }` to `InvoiceFeatures`.
   - Add `invoice-widgets` to the local known feature slug list.
   - Resolve Invoice enabled IDs with the shared helper; the result must be
     empty in this phase.
   - Fail closed to an empty widget list on evaluation failure.
   - Render `SharedWidgetDock` after `AppShellMain` only when the enabled list is
     non-empty, passing the generic IDs.
   - Update tests for success, foreign flags, and failure complete shapes.

6. In `apps/api/src/seeds/features.ts` and
   `apps/api/src/seeds/features.test.ts`:
   - Add an `invoice-widgets` master feature under `876-invoice`, before any
     future children, with `tags: ['widget']` and a clear description.
   - Do not add a child feature yet and do not invent a legacy alias.
   - Do not default-enable the new master unless an existing repository rule
     explicitly requires it. The current Billing widget master is the model.
   - Update the exact Invoice seed test to distinguish the five existing
     default-enabled shell flags from the disabled widget master.

## Scope restrictions

- Do not add Work imports, UI, metadata, flags, APIs, or persistence.
- Do not refactor Couriers, Console, Enterprise, or the consumer app.
- Do not modify API routes, database schemas, migrations, providers, or widget
  auth.
- Do not add compatibility aliases or duplicate host-side resolver helpers.
- Do not use `as any`, `@ts-ignore`, `eslint-disable`, or swallowed errors.
- Do not loosen types or production signatures to make tests easier.
- Do not edit the run's `plan.md` or this brief.

## Verification

Run these commands and report their exact outcome. Do not claim a command passed
unless you ran it successfully:

```bash
pnpm install --lockfile-only
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test -- src/seeds/features.test.ts
```

## Report

Write a concise report to
`plans/2026-09-08-invoice-billing-widget-hosts/reports/agy/2026-09-08-widget-host-foundation.md`
with:

- files changed and why;
- exact tests added or changed;
- every verification command and result;
- decisions or assumptions;
- anything incomplete or not verified.

The report is required, but never include a raw CLI transcript.
