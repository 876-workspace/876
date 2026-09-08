# Phase 1 Implementation Report: Invoice and Billing Widget Host Foundation

**Run ID**: `2026-09-08-invoice-billing-widget-hosts`  
**Date**: 2026-09-08  
**Delegate**: `agy`

## Executive Summary

Phase 1 of shared widget hosting foundation is complete. `@876/widgets` now serves as the canonical owner of host support and feature-dependency resolution through `resolveEnabledWidgetIds` and an exported catalog-derived `WidgetId` type. Billing has been refactored away from app-local Notepad knowledge to generic resolved widget IDs while preserving existing Notepad and Chat behavior. Invoice has been integrated with `@876/widgets`, gained generic widget feature state that evaluates to an empty list, renders `SharedWidgetDock` only when widgets are enabled, and gained the `invoice-widgets` seed master. Numeric per-widget panel width is now supported in `WidgetPopout.Panel` and derived in `SharedWidgetDock` from renderer metadata. No Work widget, UI, persistence, or APIs were added.

---

## Files Changed and Why

1. `packages/widgets/src/catalog.ts`
   - Added `'invoice'` to `WidgetHost` union and mapped it to `'876-invoice'` in `WIDGET_HOST_APP_SLUGS`.
   - Exported catalog-derived `WidgetId` type: `(typeof widgetCatalog)[number]['id']`.
   - Updated `isWidgetEnabled` to fail closed if a host is not in `widget.supportedHosts` or `widget.implementedHosts`.
   - Added and exported `resolveEnabledWidgetIds(host, enabledFeatureSlugs)` iterating canonical `widgetCatalog`, requiring `supportedHosts` and `implementedHosts` inclusion, and checking `isWidgetEnabled`.

2. `packages/widgets/src/index.ts`
   - Re-exported `resolveEnabledWidgetIds` and type `WidgetId`.

3. `packages/widgets/src/notepad.test.ts`
   - Asserted `WIDGET_HOST_APP_SLUGS.invoice === '876-invoice'`.
   - Asserted `resolveEnabledWidgetIds('billing', ...)` returns `['notepad', 'chat']` in catalog order when all four platform/app gates exist.
   - Asserted missing masters (`platform-widgets`, `billing-widgets`) and child gates fail closed.
   - Asserted `resolveEnabledWidgetIds('invoice', ...)` returns `[]` and `isWidgetEnabled` fails closed for Invoice even when candidate feature slugs are provided.

4. `packages/widgets/src/react/widget-popout.tsx`
   - Added `widthByItem?: Partial<Record<string, number>>` prop to `WidgetPopout.Panel`.
   - Updated `resolvePanelWidth` to give active item numeric width from `widthByItem` precedence over `size`, `sizeByItem`, and `defaultWidth` while preserving full backwards compatibility.

5. `packages/widgets/src/react/widget-dock.tsx`
   - Derived `sharedWidgetPanelWidths` map from registered renderers (`sharedWidgetRenderers.map(({ metadata }) => [metadata.id, metadata.defaultPanel.width])`).
   - Passed `widthByItem={sharedWidgetPanelWidths}` to `WidgetPopout.Panel`, removing the hard-coded `size="md"` dependency.

6. `packages/widgets/src/react/widget-popout.test.tsx`
   - Added regression test proving active items select numeric panel width from `widthByItem` with precedence over enum sizes.
   - Added test verifying fallback to `size` when active item is not in `widthByItem`.
   - Added test verifying `SharedWidgetDock` activates its panel at registered renderer metadata width (`384px`).

7. `apps/billing/src/types/features.ts`
   - Replaced `widgets: { notepad: boolean }` with `widgets: { enabledWidgetIds: WidgetId[] }`, importing `WidgetId` from `@876/widgets`.

8. `apps/billing/src/lib/features.ts`
   - Removed imports of `notepadWidgetMetadata` and `isWidgetEnabled`; imported `resolveEnabledWidgetIds` and `chatWidgetMetadata` from `@876/widgets`.
   - Resolved enabled widget IDs once with `resolveEnabledWidgetIds('billing', enabledSlugs)`.
   - Derived `uiFeatures.chat` from `enabledWidgetIds.includes(chatWidgetMetadata.id)`.
   - Updated failure fallback and success return to provide `widgets: { enabledWidgetIds }`.

9. `apps/billing/src/components/shell/shell.tsx`
   - Updated `SharedWidgetDock` condition to check `features.widgets.enabledWidgetIds.length > 0 || features.uiFeatures.chat`.
   - Passed generic `enabledWidgetIds={features.widgets.enabledWidgetIds}` to `SharedWidgetDock`.

10. `apps/billing/src/lib/features.test.ts`
    - Updated complete-shape assertions from `{ notepad: boolean }` to `{ enabledWidgetIds: WidgetId[] }`.
    - Added test proving Notepad requires all four platform and app gates (`platform-widgets`, `platform-widgets-notepad`, `billing-widgets`, `billing-widgets-notepad`) and Chat behavior remains unaffected.

11. `apps/invoice/package.json`
    - Added `"@876/widgets": "workspace:*"` dependency.

12. `pnpm-lock.yaml`
    - Updated lockfile for the new workspace dependency in `@876/invoice-app`.

13. `apps/invoice/src/types/features.ts`
    - Added `widgets: { enabledWidgetIds: WidgetId[] }` to `InvoiceFeatures`, importing `WidgetId` from `@876/widgets`.

14. `apps/invoice/src/lib/features.ts`
    - Added `INVOICE_WIDGETS_SLUG = 'invoice-widgets'` and added it to `INVOICE_FEATURE_SLUGS`.
    - Imported `resolveEnabledWidgetIds` from `@876/widgets` and resolved `enabledWidgetIds` for Invoice.
    - Updated failure fallback and success return with `widgets: { enabledWidgetIds }`.

15. `apps/invoice/src/components/shell/shell.tsx`
    - Imported `SharedWidgetDock` from `@876/widgets/react`.
    - Rendered `SharedWidgetDock` after `AppShellMain` only when `features.widgets.enabledWidgetIds.length > 0`.

16. `apps/invoice/src/lib/features.test.ts`
    - Updated complete-shape assertions to verify `widgets: { enabledWidgetIds: [] }`.
    - Added test ensuring `invoice-widgets` is recognized in `featureKeys` while `enabledWidgetIds` remains empty.

17. `apps/api/src/seeds/features.ts`
    - Added `invoice-widgets` master feature under `876-invoice` before shell flags, with `name: 'Widgets'`, `description: 'Master switch for the Invoice widget rail.'`, `tags: ['widget']`, and omitted `defaultEnabled` (disabled by default, matching Billing).

18. `apps/api/src/seeds/features.test.ts`
    - Updated Invoice seed test to assert all 6 seeds in catalog order, explicitly distinguishing the disabled `invoice-widgets` master from the 5 default-enabled shell flags.

---

## Exact Tests Added or Changed

### `packages/widgets/src/notepad.test.ts`

- **Added**: `it('maps invoice host to 876-invoice app slug')`
- **Added**: `it('resolves Billing Notepad and Chat in catalog order when all required gates exist')`
- **Added**: `it('fails closed when group masters or child gates are missing')`
- **Added**: `it('returns empty list for invoice even when invoice-widgets and candidate gates are present')`

### `packages/widgets/src/react/widget-popout.test.tsx`

- **Added**: `it('applies item-specific numeric width from widthByItem with precedence over size')`
- **Added**: `it('falls back to size when active item is not present in widthByItem')`
- **Added**: `it('allows SharedWidgetDock to use registered renderer numeric metadata width')`

### `apps/billing/src/lib/features.test.ts`

- **Changed**: `it('maps server-evaluated keys to UI capabilities')` — updated `result.widgets` assertion to `{ enabledWidgetIds: ['notepad', 'chat'] }`.
- **Changed**: `it('requires group masters before enabling child features')` — updated `result.widgets` assertion to `{ enabledWidgetIds: [] }`.
- **Changed**: `it('does not render Chat when either widget master is unavailable')` — asserted `result.widgets` is `{ enabledWidgetIds: [] }`.
- **Changed**: `it('keeps the organization switcher disabled when its feature key is absent')` — asserted `result.widgets` is `{ enabledWidgetIds: [] }`.
- **Changed**: `it('fails closed when server evaluation is unavailable')` — asserted `result.widgets` is `{ enabledWidgetIds: [] }`.
- **Added**: `it('enables Notepad only when all four platform and app gates are present')`

### `apps/invoice/src/lib/features.test.ts`

- **Changed**: `it('maps every server-evaluated Invoice key to its UI capability')` — updated assertion to include `widgets: { enabledWidgetIds: [] }`.
- **Added**: `it('includes invoice-widgets in featureKeys while enabled widget list remains empty')`
- **Changed**: `it('ignores flags belonging to another app')` — asserted `widgets: { enabledWidgetIds: [] }`.
- **Changed**: `it('fails closed and reports when server evaluation errors')` — asserted `widgets: { enabledWidgetIds: [] }`.
- **Changed**: `it('fails closed when evaluation resolves without data or error')` — asserted `widgets: { enabledWidgetIds: [] }`.

### `apps/api/src/seeds/features.test.ts`

- **Changed**: `it('seeds the five Invoice shell flags enabled without invented legacy aliases and the disabled widget master')` — validated all 6 seeds in exact sequence, verified `invoice-widgets` metadata and that `defaultEnabled` is undefined, verified the five shell flags remain `defaultEnabled: true`, and verified no `legacySlugs` are present.

---

## Verification Commands and Results

All verification commands executed cleanly in the foreground with exit code 0:

| Command                                                     | Exit Code | Result Summary                                       |
| ----------------------------------------------------------- | --------- | ---------------------------------------------------- |
| `pnpm install --lockfile-only`                              | `0`       | Lockfile up to date across all 44 workspace packages |
| `pnpm --filter @876/widgets typecheck`                      | `0`       | Clean typecheck (`tsc --noEmit`)                     |
| `pnpm --filter @876/widgets test`                           | `0`       | 13 test files passed, 130 tests passed               |
| `pnpm --filter @876/billing-app typecheck`                  | `0`       | Clean typecheck (`tsc --noEmit`)                     |
| `pnpm --filter @876/billing-app test`                       | `0`       | 86 test files passed, 863 tests passed               |
| `pnpm --filter @876/invoice-app typecheck`                  | `0`       | Clean typecheck (`tsc --noEmit`)                     |
| `pnpm --filter @876/invoice-app test`                       | `0`       | 57 test files passed, 403 tests passed               |
| `pnpm --filter @876/api typecheck`                          | `0`       | Prisma generated + clean typecheck (`tsc --noEmit`)  |
| `pnpm --filter @876/api test -- src/seeds/features.test.ts` | `0`       | 114 test files passed, 2265 tests passed             |
| `pnpm exec prettier --check <touched files>`                | `0`       | All modified files adhere to Prettier formatting     |

---

## Key Decisions and Rationale

1. **Resolver Signature and Host Safeguards**: `resolveEnabledWidgetIds` accepts `ReadonlySet<string> | readonly string[]` and iterates canonical `widgetCatalog`, requiring both `supportedHosts` and `implementedHosts` to include the host and delegating feature checks to `isWidgetEnabled`. In addition, `isWidgetEnabled` explicitly validates host support/implementation, failing closed so direct callers cannot enable incomplete host implementations.
2. **Chat Separation Invariant**: `chatWidgetMetadata` continues to be cataloged as a shared widget for feature-gate consistency, but is excluded from `sharedWidgetRenderers` in `packages/widgets/src/react/widget-dock.tsx`. Billing derives `uiFeatures.chat` directly from `enabledWidgetIds.includes(chatWidgetMetadata.id)`, ensuring its existing separate secondary rail behavior is maintained.
3. **Dock Panel Width Derivation**: Rather than hardcoding `size="md"`, `SharedWidgetDock` derives `widthByItem` from registered renderers' `metadata.defaultPanel.width`. `WidgetPopout.Panel` gives `widthByItem` precedence for active items while preserving `size`, `sizeByItem`, and `defaultWidth` fallbacks for any existing or future consumers.
4. **Zero Knowledge of Specific Widgets in Invoice**: Invoice resolves widget IDs via the shared helper and evaluates to `[]`. Its shell mounts `SharedWidgetDock` only when `enabledWidgetIds.length > 0`, avoiding any dock mounting when no widgets are active.
5. **Billing Decoupling**: Billing no longer imports `notepadWidgetMetadata` or checks Notepad gates locally; it consumes the resolved list from `@876/widgets`.
6. **Feature Seed Modeling**: `invoice-widgets` was placed before any future children with `tags: ['widget']` and omitted `defaultEnabled`, following `billing-widgets` as instructed.

---

## Incomplete or Unverified Items

None. All required features, types, host bindings, dock widths, tests, and formatting checks are complete and verified. No commits, pushes, branches, or PRs were created.
