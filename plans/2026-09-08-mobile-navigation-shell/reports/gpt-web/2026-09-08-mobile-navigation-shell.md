# GPT Web Implementation Report: Mobile Navigation Shell Alignment

- **Run ID:** `2026-09-08-mobile-navigation-shell`
- **Branch:** `fix/mobile-navigation-shell`
- **Base:** `main` at `9a146456bc42f66af422fe87a0dd6d2c935cb678`
- **Implementation status:** complete in code
- **Executable verification:** not run by GPT Web
- **PR:** not opened

## Outcome

The finance apps keep their intended docked desktop sidebars, while mobile navigation is now an explicit product-shell concern instead of an accidental rendering of the generic `@876/ui/sidebar` mobile fallback. CRM no longer has a separate horizontal mobile strip. Console now reuses the same shared mobile drawer presentation while retaining its own context-stack resolver and back-navigation semantics.

The shared contract is `@876/ui/product-mobile-nav`. It consumes the same resolved `NavGroupDefinition[]` used by desktop navigation, so permission and feature filtering remain upstream and do not fork between desktop and mobile.

## Phase status and focused test coverage

| Phase | Status | New `it()` cases | Notes |
| --- | --- | ---: | --- |
| Reuse/rules/test-environment audit | complete | 0 | Read repository rules, current shell implementations, `NavGroupDefinition`, shared Sheet primitives, and each touched package's Vitest environment. |
| Shared `ProductMobileNav` | complete | 6 | Covers branded grouped drawer, nested active route, disclosure state, close-after-navigation, contextual back action, and caller-supplied active/navigation hooks. |
| Billing integration | complete | 2 | Wrapper contract plus explicit docked desktop sidebar regression. |
| Invoice integration | complete | 2 | Wrapper contract plus explicit docked desktop sidebar regression. |
| CRM integration | complete | 2 | Wrapper contract plus floating desktop rail/no-horizontal-mobile-strip regression. |
| Console presentation extraction | complete | 2 | Root shared-drawer contract and nested context active/back behavior. |
| **Total** | **complete in code** | **14** | Tests were written but not executed by GPT Web. |

## Architecture decisions

### Desktop geometry stays app-specific

- Billing: `variant="sidebar"`, `collapsible="icon"`, docked to the viewport edge.
- Invoice: `variant="sidebar"`, `collapsible="icon"`, docked to the viewport edge.
- CRM: existing floating icon rail retained on desktop.
- Console: existing context-aware desktop rail retained.

The implementation intentionally does **not** create a single desktop-sidebar visual treatment.

### Mobile presentation is shared

`ProductMobileNav` owns:

- left-side Sheet chrome and responsive width;
- 876 logo/header treatment;
- grouped navigation rendering and dividers;
- 44px-class touch targets;
- active row and icon-tile treatment;
- inline child disclosure when the caller wants it;
- close-after-navigation behavior;
- optional contextual back action;
- optional caller-provided active-route semantics;
- optional caller navigation callback;
- explicit trigger/navigation accessibility labels;
- a titleless-visible-header mode with a separate accessible title for Console's root context.

Apps own their product title/subtitle, icon resolver, resolved navigation data, and any specialized route semantics.

### Billing and Console intentionally use different child policies

A late review found that the same `NavEntry.children` field represents two different UI policies:

- Billing uses children as an inline mobile submenu (`Sales`, `Subscriptions`, `Purchases`).
- Console uses children to describe entries that open a new sidebar context.

`ProductMobileNav` therefore exposes `expandChildren` (default `true`). Console passes `false` and keeps its existing context-stack behavior; Billing uses the default inline disclosure. This avoids silently changing Console navigation semantics while still sharing presentation.

### Console context logic remains local

The following remain in Console rather than being generalized into `@876/ui`:

- `resolveSidebarContextStack`;
- `resolveSidebarBackContext`;
- `resolveActiveEntryKey`;
- `entryOpensContext`;
- dismissed/back context state.

The former duplicated Sheet/list markup in Console was removed. Console now adapts its resolved current context to the shared presentation component.

### Canonical responsive switch

Billing and Invoice already use the shared sidebar's `md` desktop breakpoint. CRM's floating rail now also switches at `md`; its old `sm:hidden` horizontal strip was removed.

## Files changed and why

### Shared UI

- `packages/ui/src/components/product-mobile-nav.tsx` — new reusable mobile drawer presentation. Supports grouped entries, nested disclosures, active-state hooks, contextual back action, custom icon/color resolution, explicit accessibility labels, close-after-navigation, and Console's context policy.
- `packages/ui/src/components/product-mobile-nav.test.tsx` — six focused shared interaction/contract cases.

### Billing

- `apps/billing/src/components/shell/mobile-nav.tsx` — app-local adapter supplying Billing identity and `resolveBillingNavIcon` to the shared component.
- `apps/billing/src/components/shell/mobile-nav.test.tsx` — protects the adapter contract.
- `apps/billing/src/components/shell/shell.tsx` — renders the new drawer trigger on mobile, keeps `SidebarTrigger` desktop-only, and hides the generic sidebar rendering below `md`.
- `apps/billing/src/components/shell/sidebar.test.tsx` — protects `variant="sidebar"` and the expanded docked desktop rail contract.

### Invoice

- `apps/invoice/src/components/shell/mobile-nav.tsx` — app-local adapter supplying Invoice identity and `resolveInvoiceNavIcon`.
- `apps/invoice/src/components/shell/mobile-nav.test.tsx` — protects the adapter contract.
- `apps/invoice/src/components/shell/shell.tsx` — renders the dedicated mobile drawer while keeping the desktop sidebar trigger and docked sidebar behavior.
- `apps/invoice/src/components/shell/sidebar.test.tsx` — protects the docked desktop sidebar contract.

### CRM

- `apps/crm/src/components/shell/nav-icons.ts` — moves the former sidebar-inline icon registry into one app-local owner shared by desktop and mobile; uses app-local names `NAV_ICONS` / `resolveNavIcon` per repository naming rules.
- `apps/crm/src/components/shell/mobile-nav.tsx` — app-local adapter for the shared drawer.
- `apps/crm/src/components/shell/mobile-nav.test.tsx` — protects the adapter contract.
- `apps/crm/src/components/shell/sidebar.tsx` — removes the horizontal mobile strip, keeps only the floating desktop rail, changes its responsive switch from `sm` to `md`, and reuses the shared local icon resolver.
- `apps/crm/src/components/shell/sidebar.test.tsx` — verifies the floating desktop rail remains and the old mobile strip is absent.
- `apps/crm/src/components/shell/shell.tsx` — places the mobile drawer trigger in the top bar and removes the old body layout dependency on the horizontal strip.

### Console

- `apps/console/src/components/shell/mobile-nav.tsx` — removes duplicated Sheet/header/row markup and adapts the existing context stack into `ProductMobileNav`; preserves active-entry resolution, context-opening behavior, back behavior, icon color fallback, and the intentionally titleless root context.
- `apps/console/src/components/shell/mobile-nav.test.tsx` — protects root presentation policy and nested active/back context behavior.

### Run tracking

- `plans/2026-09-08-mobile-navigation-shell/plan.md` — run plan/tracker required by repository rules.
- `plans/2026-09-08-mobile-navigation-shell/reports/gpt-web/2026-09-08-mobile-navigation-shell.md` — this implementation report.

## Review findings addressed during implementation

1. **Do not float Billing/Invoice desktop sidebars.** Their existing `variant="sidebar"` behavior was preserved and now has focused regression coverage.
2. **Do not duplicate Console's mobile drawer into three apps.** Presentation was extracted to `@876/ui` instead.
3. **Do not flatten Billing children.** Nested finance navigation remains available as inline mobile disclosure.
4. **Do not treat Console children like Billing children.** `expandChildren={false}` preserves context-opening semantics.
5. **Do not move Console domain/routing state into shared UI.** Only presentation moved.
6. **Do not add CRM-prefixed local symbols.** A review caught and corrected the initially added app-prefixed icon resolver names.
7. **Avoid state-sync effects for route changes.** Route-sensitive mobile rows are keyed by pathname so active nested disclosure state initializes correctly after navigation without a synchronization effect.
8. **Preserve Console's titleless root context.** The shared component supports a separate accessible title so the root remains visually unchanged without leaving the Sheet unnamed.

## Static diff review

A final GitHub comparison against `main` reported:

- status: `ahead`;
- `behind_by: 0`;
- merge base: `9a146456bc42f66af422fe87a0dd6d2c935cb678`;
- touched scope limited to the mobile navigation implementation/tests and this run's plan/report.

No migrations, API routes, data models, permission catalogs, feature-flag resolution, or finance-domain behavior were changed.

No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `any` escape hatch, or generated compatibility shim was intentionally introduced in this run.

## Verification not executed by GPT Web

Per the GPT Web operating rules, no executable test, typecheck, lint, build, formatter, or browser run is claimed here. The test files above are implementation artifacts, not passing evidence.

Recommended local/orchestrator verification:

```bash
pnpm --filter @876/ui test
pnpm --filter @876/ui typecheck

pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app typecheck

pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app typecheck

pnpm --filter @876/crm-app test
pnpm --filter @876/crm-app typecheck

pnpm --filter @876/console test
pnpm --filter @876/console typecheck
```

Focused tests worth running first:

```bash
pnpm --filter @876/ui exec vitest run src/components/product-mobile-nav.test.tsx
pnpm --filter @876/billing-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/invoice-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/crm-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/console exec vitest run src/components/shell/mobile-nav.test.tsx
```

Then run the repository's normal formatting/lint/boundary checks required by the local orchestration workflow.

## Browser acceptance still required

The local agent should visually verify at minimum 375px, 390px/430px, 768px, 1024px, and a wide desktop size in light and dark themes:

- Billing/Invoice: docked desktop rail remains flush to the left edge; mobile shows only the dedicated hamburger/drawer, not the generic sidebar Sheet.
- Billing: Sales/Subscriptions/Purchases child disclosure is touch-usable and active child routes reopen expanded.
- CRM: no horizontal navigation strip appears below the top bar; floating rail appears at `md` and above.
- Console: root remains visually titleless, nested contexts retain title/subtitle, active entry, back-to-parent behavior, and context re-entry.
- Drawer closes after route selection and remains open when only toggling an inline disclosure or contextual Back action.

## Handoff / remaining work

Implementation is complete in the branch. Remaining work is executable verification and browser acceptance only. If verification finds a defect, fix it on `fix/mobile-navigation-shell`; do not recreate app-specific mobile drawer markup or change Billing/Invoice desktop geometry as a shortcut.
