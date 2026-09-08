# Implementation Plan: Mobile Navigation Shell Alignment

- **Run ID:** `2026-09-08-mobile-navigation-shell`
- **Branch:** `fix/mobile-navigation-shell`
- **Base:** `main` at `9a146456bc42f66af422fe87a0dd6d2c935cb678`
- **Status:** `COMPLETED ✅` — code implementation complete; executable/browser verification handed off

## Overview

Billing and Invoice correctly use docked desktop sidebars, but their mobile navigation relied on the generic `@876/ui/sidebar` mobile Sheet fallback. CRM used a separate horizontal mobile strip, while Console owned a dedicated modern drawer implementation. This run standardizes mobile navigation presentation without forcing every app to use the same desktop sidebar geometry.

## Objectives

1. Preserve Billing and Invoice as docked, collapsible desktop sidebars.
2. Preserve CRM as a floating desktop rail.
3. Introduce one reusable mobile navigation presentation in `@876/ui`.
4. Render product mobile navigation from the same resolved `NavGroupDefinition[]` used by desktop.
5. Support nested mobile entries for Billing without changing Console's context-stack semantics.
6. Remove CRM's horizontal mobile strip.
7. Reuse the shared presentation from Console while leaving Console routing/context state local.
8. Add focused regression coverage around shared behavior and each app integration.

## Architectural Scope

### Shared

- `packages/ui/src/components/product-mobile-nav.tsx`
- `packages/ui/src/components/product-mobile-nav.test.tsx`

### Billing

- `apps/billing/src/components/shell/mobile-nav.tsx`
- `apps/billing/src/components/shell/mobile-nav.test.tsx`
- `apps/billing/src/components/shell/shell.tsx`
- `apps/billing/src/components/shell/sidebar.test.tsx`

### Invoice

- `apps/invoice/src/components/shell/mobile-nav.tsx`
- `apps/invoice/src/components/shell/mobile-nav.test.tsx`
- `apps/invoice/src/components/shell/shell.tsx`
- `apps/invoice/src/components/shell/sidebar.test.tsx`

### CRM

- `apps/crm/src/components/shell/nav-icons.ts`
- `apps/crm/src/components/shell/mobile-nav.tsx`
- `apps/crm/src/components/shell/mobile-nav.test.tsx`
- `apps/crm/src/components/shell/sidebar.tsx`
- `apps/crm/src/components/shell/sidebar.test.tsx`
- `apps/crm/src/components/shell/shell.tsx`

### Console

- `apps/console/src/components/shell/mobile-nav.tsx`
- `apps/console/src/components/shell/mobile-nav.test.tsx`

### Explicitly unchanged

- Billing/Invoice desktop `variant="sidebar"` geometry.
- Console's context-stack resolver and route semantics.
- Permission/feature-flag resolution.
- Navigation registry ownership.
- API routes, data models, migrations, and finance-domain behavior.

## Key Design Decisions

1. **Desktop geometry and mobile navigation are separate concerns.** Desktop remains product-specific; mobile presentation is standardized.
2. **One navigation source.** Mobile consumes the same resolved `NavGroupDefinition[]` as desktop so permission/feature filtering cannot drift.
3. **Shared presentation only.** `@876/ui` owns Sheet chrome, mobile rows, active presentation, grouping, optional child disclosure, accessibility, contextual back presentation, and close-after-navigation. Apps own identity, icon resolution, and specialized route semantics.
4. **Nested policy is explicit.** Billing uses the shared default `expandChildren=true` for inline Sales/Subscriptions/Purchases disclosure. Console passes `expandChildren=false` because its `children` declare drill-down contexts instead.
5. **Console context logic stays local.** `resolveSidebarContextStack`, `resolveSidebarBackContext`, `resolveActiveEntryKey`, `entryOpensContext`, and dismissed-context state were not moved into shared UI.
6. **Console root remains visually titleless.** `ProductMobileNav` accepts a separate `accessibleTitle` so the root Sheet stays named without restoring a redundant visible Console label.
7. **Canonical breakpoint for these integrations is `md`.** Billing/Invoice already followed the shared sidebar's `md` boundary; CRM now switches from drawer to floating rail at the same breakpoint.
8. **Route-sensitive disclosure state does not use a synchronization effect.** Shared mobile rows are keyed by pathname so an active nested section initializes correctly when the route changes.
9. **No extra AppShell wrapper API was added.** Existing shell placement primitives plus one shared mobile presentation component solve the drift without adding thin layout abstractions whose only job would be responsive class names.

## Dispatched Briefs

None. This run was executed directly by GPT Web through the GitHub connector.

## Execution Reports

| Delegate | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-08-mobile-navigation-shell.md` | complete |

## Task Checklist

### Phase 1 — Reuse and contract audit

- [x] Read `CLAUDE.md` and GPT Web operating rules.
- [x] Read required code quality, naming, type, testing, error, app structure/layout, performance, data-fetching, git, execution-autonomy, and tracker rules.
- [x] Verify current Billing, Invoice, CRM, Console, `@876/ui/sidebar`, Sheet primitives, and navigation registry shapes.
- [x] Inspect touched package Vitest environments before adding component tests.

### Phase 2 — Shared mobile navigation primitive

- [x] Add `ProductMobileNav` to `@876/ui`.
- [x] Support grouped entries, inline child disclosure, active rows, accessible Sheet chrome, contextual back action, custom active/navigation hooks, and close-after-navigation.
- [x] Support titleless visible contexts with a separate accessible title.
- [x] Add six focused shared component test cases.

### Phase 3 — Billing

- [x] Add app-local mobile navigation adapter using Billing's icon resolver.
- [x] Render the dedicated mobile nav from the top bar.
- [x] Suppress the generic sidebar rendering on mobile without changing `variant="sidebar"` / `collapsible="icon"` desktop behavior.
- [x] Preserve nested Sales/Subscriptions/Purchases navigation through inline disclosure.
- [x] Add wrapper and docked-desktop regression tests.

### Phase 4 — Invoice

- [x] Add app-local mobile navigation adapter using Invoice's icon resolver.
- [x] Render the dedicated mobile nav from the top bar.
- [x] Suppress generic mobile sidebar rendering while preserving the docked desktop sidebar.
- [x] Add wrapper and docked-desktop regression tests.

### Phase 5 — CRM

- [x] Add an app-local shared icon registry owner for desktop and mobile.
- [x] Add app-local mobile navigation adapter.
- [x] Remove the horizontal mobile navigation strip.
- [x] Render the shared drawer trigger from the top bar.
- [x] Preserve the floating desktop rail and align its responsive switch to `md`.
- [x] Add wrapper and desktop/mobile-regression tests.

### Phase 6 — Console presentation extraction

- [x] Replace duplicated mobile Sheet/header/row markup with `ProductMobileNav`.
- [x] Preserve Console context-stack, active-entry, back, icon-color, and context-reentry behavior locally.
- [x] Keep context-owning entries as links rather than inline disclosures.
- [x] Preserve the titleless platform root with an accessible Sheet title.
- [x] Add root and nested-context regression tests.

### Phase 7 — Review and closeout

- [x] Review branch diff against `main` for scope, duplicate ownership, naming, compatibility residue, and desktop regressions.
- [x] Correct the initially added CRM app-prefixed local icon symbol names.
- [x] Remove route-state synchronization effect from the shared disclosure implementation.
- [x] Confirm branch remains `behind_by: 0` relative to `main` at closeout.
- [x] Write GPT Web implementation report.
- [x] Mark plan complete with verification handoff documented.

## Focused Test Cases Added

- `@876/ui`: 6
- Billing: 2
- Invoice: 2
- CRM: 2
- Console: 2
- **Total:** 14 new `it()` cases

These tests were written but **not executed by GPT Web**.

## Verification Commands

GPT Web did not run executable verification. The local/orchestrating agent should run:

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

Focused first pass:

```bash
pnpm --filter @876/ui exec vitest run src/components/product-mobile-nav.test.tsx
pnpm --filter @876/billing-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/invoice-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/crm-app exec vitest run src/components/shell/mobile-nav.test.tsx src/components/shell/sidebar.test.tsx
pnpm --filter @876/console exec vitest run src/components/shell/mobile-nav.test.tsx
```

Also run the repository's normal formatter/lint/boundary checks and perform browser acceptance at mobile/tablet/desktop breakpoints in light and dark themes.

## Multi-Session Continuity / Handoff

Implementation is complete on `fix/mobile-navigation-shell`. The final GitHub comparison before documentation closeout showed the branch directly ahead of `main`, `behind_by: 0`, with merge base `9a146456bc42f66af422fe87a0dd6d2c935cb678`.

Remaining work is verification only:

1. Run the focused tests above.
2. Run full test/typecheck for the five touched packages/apps.
3. Run formatting/lint/boundary checks required by the local workflow.
4. Browser-check Billing/Invoice docked desktop behavior and all four mobile drawers, especially Billing child disclosure and Console context back/re-entry.
5. Fix any verification defect on this same branch; do not reintroduce app-specific drawer markup or make Billing/Invoice floating.

## PR Preparation Summary

- Branch: `fix/mobile-navigation-shell`
- Base: `main` / `9a146456bc42f66af422fe87a0dd6d2c935cb678`
- Implementation/report through commit: `c69650435b1f39c5ef40a8dc65b6389d454e0ea5`
- Final plan closeout follows that report commit.
- No migrations.
- No PR opened by GPT Web.
- Executable verification remains to be supplied by the local/orchestrating agent before merge.
