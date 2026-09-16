# Implementation Plan: Invoice and Billing Widget Hosts

Run ID: `2026-09-08-invoice-billing-widget-hosts`

Branch: `feat/invoice-billing-widget-hosts`

Status: `COMPLETED ✅`

## Overview and objectives

Make Invoice and Billing consume shared widgets through one catalog-owned host
resolution path. This phase adds no Work widget or Work-specific UI. Billing's
existing Notepad and Chat behavior must remain intact, while Invoice becomes a
widget-capable host whose enabled widget list is initially empty.

## Architectural scope and invariants

- `packages/widgets` owns widget host names, host support/implementation
  metadata, feature dependencies, enabled-ID resolution, render registration,
  and per-widget panel width.
- `apps/billing` and `apps/invoice` consume resolved widget IDs; neither app
  re-derives a specific widget's feature dependency.
- `apps/api/src/seeds/features.ts` remains the feature catalog owner and gains
  only the Invoice widget-group master in this phase.
- No Work UI, Work feature child, Work renderer, widget API, provider call, or
  persistence change is in scope.
- Feature evaluation continues to fail closed.
- Billing Notepad and Chat behavior must not regress.
- Invoice must not render a widget dock while its resolved list is empty.

## Key design decisions

1. Add `invoice` to `WidgetHost` and map it to `876-invoice`.
2. Export a catalog-derived `WidgetId` and a single
   `resolveEnabledWidgetIds(host, enabledFeatureSlugs)` helper. It returns only
   catalog entries whose metadata says the host is implemented and whose
   complete platform/app feature dependency chain is enabled.
3. Keep Chat's existing secondary-rail presentation. Widget metadata classifies
   panel versus secondary-rail surfaces, so the generic enabled-ID resolver
   returns only panel widgets and Billing continues to evaluate Chat through
   the same catalog metadata without passing an unrenderable ID to the dock.
4. Replace Billing's `{ notepad: boolean }` widget state with
   `{ enabledWidgetIds: WidgetId[] }`. This removes app-local Notepad feature
   knowledge without widening this phase into a Couriers or Console refactor.
5. Give Invoice the same generic widget state. The new `invoice-widgets`
   master is catalogued, but no widget has Invoice app-child metadata in this
   phase, so resolution remains empty even if the master is enabled.
6. Add item-specific numeric widths to the shared popout panel and make
   `SharedWidgetDock` derive them from `WidgetMetadata.defaultPanel.width`.
   Existing enum-based sizing remains available to other consumers.

## Dispatched briefs

| Delegate                        | Brief                                                                       |
| ------------------------------- | --------------------------------------------------------------------------- |
| `agy` (`gemini-3.8-flash-high`) | [Phase 1 implementation](./briefs/agy/2026-09-08-widget-host-foundation.md) |

## Execution reports

| Delegate     | Report                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| `agy`        | [Phase 1 implementation report](./reports/agy/2026-09-08-widget-host-foundation.md) |
| Orchestrator | [Review and verification](./reports/orchestrator/2026-09-08-review.md)              |

## Task checklist

- [x] Inspect current widget catalog, Billing host, Invoice shell, feature
      states, feature seeds, and related tests.
- [x] Record the implementation plan and delegated brief.
- [x] Add Invoice to the shared host contract and add catalog-owned enabled-ID
      resolution with tests.
- [x] Make shared dock panel widths metadata-driven with regression coverage.
- [x] Refactor Billing to generic enabled widget IDs without changing Notepad
      or Chat behavior.
- [x] Add the widgets dependency, generic feature state, empty gated dock, and
      `invoice-widgets` feature master to Invoice.
- [x] Review delegated output for scope, duplicate logic, compatibility
      residue, swallowed errors, unsafe type escapes, and disabled lint rules.
- [x] Run the thermo-nuclear maintainability review and apply warranted fixes.
- [x] Run focused formatting, typechecks, and tests.
- [x] Record final verification evidence and handoff state.

## Verification commands

```bash
pnpm exec prettier --check packages/widgets/src/catalog.ts packages/widgets/src/notepad.test.ts packages/widgets/src/react/widget-dock.tsx packages/widgets/src/react/widget-popout.tsx packages/widgets/src/react/widget-popout.test.tsx apps/billing/src/lib/features.ts apps/billing/src/lib/features.test.ts apps/billing/src/types/features.ts apps/billing/src/components/shell/shell.tsx apps/invoice/src/lib/features.ts apps/invoice/src/lib/features.test.ts apps/invoice/src/types/features.ts apps/invoice/src/components/shell/shell.tsx apps/api/src/seeds/features.ts apps/api/src/seeds/features.test.ts apps/invoice/package.json pnpm-lock.yaml
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test -- src/seeds/features.test.ts
```

## Multi-session continuity and handoff state

Implementation, delegated execution, strict review, corrections, and focused
verification are complete on `feat/invoice-billing-widget-hosts`, based on the
latest `origin/main`. The review corrections classified panel versus
secondary-rail widgets in metadata, centralized duplicated host labels, removed
an unnecessary resolver input branch, and removed an unnecessary non-null
assertion.

Verification results (2026-09-08):

- Prettier: ✅ all target files formatted
- `@876/widgets` typecheck: ✅
- `@876/widgets` test: ✅ 130/130
- `@876/billing-app` typecheck: ✅
- `@876/billing-app` test: ⚠️ 862/863 on the first branch-based full run due to
  an unrelated roles-panel test exceeding its 5-second timeout; that file then
  passed 12/12 in isolation, and the changed feature suite passed 7/7
- `@876/invoice-app` typecheck: ✅
- `@876/invoice-app` test: ✅ 403/403
- `@876/console` typecheck: ✅
- `@876/api` typecheck: ✅
- `@876/api` test (seeds/features.test.ts): ✅ 12/12 (full suite: 2265/2265)
- Focused ESLint: ✅ for all touched files except three pre-existing
  `react-hooks/refs` errors in `widget-popout.tsx`, reproduced from `HEAD`

Do not commit without an explicit user request.

## PR preparation summary

Implementation is ready for focused commits and a pull request to `main`.
