# Implementation Plan: Couriers modernization

Run ID: 2026-09-13-couriers-modernization · Branch: feature/couriers-modernization (from main) · Status: COMPLETED

## Objective
Bring `apps/couriers` onto current ecosystem shared components.

## Audit findings (2026-09-13)
- App structure check: already passes. Bounded clients, no server actions, no legacy SDK shims.
- Headings: remaining hand-styled headings are in the customer portal and onboarding (not sidebar-app pages) — out of scope for app-layout §10b.
- Dialogs: only AlertDialog confirmations and a 2-field invite quick action — compliant with app-layout §1.
- Gap A: invoices/payments/items render app-local tables duplicating `@876/billing-ui`.
- Gap B: customers does not use the shared list/detail split view.

## Phases
- [x] A. Finance lists → `@876/billing-ui` (brief: briefs/sub-agent/finance-shared-ui.md)
- [x] B. Customers → `ListDetailSection`/`ListDetailShell` (brief: briefs/sub-agent/customers-split-view.md)

## Verification
pnpm --filter @876/couriers-app typecheck · lint · test · node scripts/check-app-structure.mjs · pnpm check:transpile

## Final verification (2026-09-13, orchestrator)
Split views for invoices, payments, items, deliveries, disputes, pre-alerts, manifest landed (opencode muse 1.3 run, stopped before its report; finished by orchestrator).
Fixes applied on review: couriers tsconfig target ES2020 (billing-ui BigInt), `src/test/resolve-server-tree.ts` so detail-layout tests actually render streamed headers, disambiguated duplicate-text assertions, missing next/navigation mock exports.
couriers: tsc 0 errors · eslint 0 errors (12 pre-existing warnings) · vitest 105 files / 965 tests pass. billing-ui 550 pass. app-structure OK. Every section ≥20 it().
