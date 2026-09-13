# Implementation Plan: Couriers modernization

Run ID: 2026-09-13-couriers-modernization · Branch: feature/couriers-modernization (from main) · Status: IN_PROGRESS

## Objective
Bring `apps/couriers` onto current ecosystem shared components.

## Audit findings (2026-09-13)
- App structure check: already passes. Bounded clients, no server actions, no legacy SDK shims.
- Headings: remaining hand-styled headings are in the customer portal and onboarding (not sidebar-app pages) — out of scope for app-layout §10b.
- Dialogs: only AlertDialog confirmations and a 2-field invite quick action — compliant with app-layout §1.
- Gap A: invoices/payments/items render app-local tables duplicating `@876/billing-ui`.
- Gap B: customers does not use the shared list/detail split view.

## Phases
- [ ] A. Finance lists → `@876/billing-ui` (brief: briefs/sub-agent/finance-shared-ui.md)
- [ ] B. Customers → `ListDetailSection`/`ListDetailShell` (brief: briefs/sub-agent/customers-split-view.md)

## Verification
pnpm --filter @876/couriers-app typecheck · lint · test · node scripts/check-app-structure.mjs · pnpm check:transpile
