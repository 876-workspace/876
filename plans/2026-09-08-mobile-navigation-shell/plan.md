# Implementation Plan: Mobile Navigation Shell Alignment

- **Run ID:** `2026-09-08-mobile-navigation-shell`
- **Branch:** `fix/mobile-navigation-shell`
- **Status:** `IN_PROGRESS`

## Overview

Billing and Invoice correctly use docked desktop sidebars, but their mobile navigation still relies on the generic `@876/ui/sidebar` mobile Sheet fallback. CRM uses a separate horizontal mobile strip, while Console has the newer dedicated mobile drawer treatment. This run standardizes the mobile navigation presentation without forcing every app to use the same desktop sidebar geometry.

## Objectives

1. Preserve Billing and Invoice as docked, collapsible desktop sidebars.
2. Preserve CRM as a floating desktop rail.
3. Introduce one reusable mobile navigation presentation in `@876/ui` for product apps.
4. Render Billing, Invoice, and CRM mobile navigation from the same resolved `NavGroupDefinition[]` used by desktop.
5. Support nested mobile navigation entries so Billing's grouped sales navigation remains usable.
6. Remove CRM's horizontal mobile strip.
7. Add focused regression coverage for the shared mobile component and each app integration.

## Architectural Scope

### Shared

- `packages/ui/src/components/product-mobile-nav.tsx`
- colocated shared component tests

### Billing

- `apps/billing/src/components/shell/mobile-nav.tsx`
- `apps/billing/src/components/shell/shell.tsx`
- shell/mobile navigation tests as required

### Invoice

- `apps/invoice/src/components/shell/mobile-nav.tsx`
- `apps/invoice/src/components/shell/shell.tsx`
- shell/mobile navigation tests as required

### CRM

- `apps/crm/src/components/shell/mobile-nav.tsx`
- `apps/crm/src/components/shell/sidebar.tsx`
- `apps/crm/src/components/shell/shell.tsx`
- shell/mobile navigation tests as required

### Explicitly out of scope

- Changing Billing or Invoice to floating desktop sidebars.
- Moving Console's route/context stack into `@876/ui`.
- Changing permission or feature-flag resolution.
- Adding new navigation registries or duplicating app navigation data.

## Key Design Decisions

1. **Desktop geometry and mobile navigation are separate concerns.** Desktop remains product-specific; mobile presentation is standardized.
2. **One navigation source.** Mobile consumes the same resolved `NavGroupDefinition[]` as desktop so permission/feature filtering cannot drift.
3. **Shared presentation only.** `@876/ui` owns Sheet chrome, mobile rows, active state, groups, disclosure behavior, accessibility, and close-after-navigation. Apps own product title, subtitle, icon resolution, and route semantics.
4. **Nested entries expand inline on mobile.** This covers Billing children without reusing desktop collapse/dropdown behavior.
5. **Console is not rewritten in this run.** Its context-stack behavior is more advanced and already correct; later cleanup may adapt its presentation to the shared primitive without moving Console-specific state resolution into `@876/ui`.
6. **Canonical breakpoint is `md` for these migrations.** Billing/Invoice already use the shared sidebar's `md` desktop breakpoint; CRM will align while its desktop rail remains visually unchanged above that breakpoint.

## Dispatched Briefs

None. This run is executed directly by GPT Web through the GitHub connector.

## Execution Reports

| Delegate | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-08-mobile-navigation-shell.md` | pending |

## Task Checklist

### Phase 1 — Reuse and contract audit

- [x] Read `CLAUDE.md` and GPT Web operating rules.
- [x] Read required code quality, naming, type, testing, error, app structure/layout, performance, data-fetching, git, execution-autonomy, and tracker rules.
- [x] Verify current Billing, Invoice, CRM, Console, `@876/ui/sidebar`, and navigation registry shapes.
- [ ] Inspect existing shell tests and Vitest environments before writing component tests.

### Phase 2 — Shared mobile navigation primitive

- [ ] Add `ProductMobileNav` to `@876/ui`.
- [ ] Support grouped entries, nested disclosure, active rows, accessible Sheet chrome, and close-after-navigation.
- [ ] Add focused shared component tests.

### Phase 3 — Billing

- [ ] Add app-local mobile navigation wrapper using Billing's icon resolver.
- [ ] Render the dedicated mobile nav from the top bar.
- [ ] Hide the desktop sidebar area on mobile without changing `variant="sidebar"` / `collapsible="icon"`.
- [ ] Add regression tests for docked desktop + new mobile drawer + nested navigation.

### Phase 4 — Invoice

- [ ] Add app-local mobile navigation wrapper using Invoice's icon resolver.
- [ ] Render the dedicated mobile nav from the top bar.
- [ ] Hide the desktop sidebar area on mobile without changing `variant="sidebar"` / `collapsible="icon"`.
- [ ] Add regression tests for docked desktop + new mobile drawer.

### Phase 5 — CRM

- [ ] Add app-local mobile navigation wrapper.
- [ ] Remove the horizontal mobile navigation strip from the desktop sidebar component.
- [ ] Render the shared drawer trigger from the top bar.
- [ ] Preserve the floating desktop rail and align its responsive switch to `md`.
- [ ] Add regression tests for floating desktop + drawer mobile behavior.

### Phase 6 — Review and closeout

- [ ] Review branch diff for duplicate helpers, compatibility residue, scope creep, suppressions, and hidden desktop regressions.
- [ ] Write GPT Web implementation report.
- [ ] Mark this plan `COMPLETED` with final commit references and handoff state.

## Verification Commands

Not executable from GPT Web. The orchestrator/local agent should run:

```bash
pnpm --filter @876/ui test
pnpm --filter @876/ui typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice test
pnpm --filter @876/invoice typecheck
pnpm --filter @876/crm test
pnpm --filter @876/crm typecheck
pnpm exec prettier --check \
  packages/ui/src/components/product-mobile-nav.tsx \
  apps/billing/src/components/shell \
  apps/invoice/src/components/shell \
  apps/crm/src/components/shell
```

Use the exact package names from each app's `package.json` if any differ from the filters above.

## Multi-Session Continuity / Handoff

Current state: branch created from `main`; rules and existing shell architecture have been audited; no production code has been changed yet. Next step is to inspect local Vitest configs and nearby shell tests, then implement the shared mobile primitive before app migrations.

## PR Preparation Summary

Pending implementation and verification. No PR is to be opened by GPT Web.
