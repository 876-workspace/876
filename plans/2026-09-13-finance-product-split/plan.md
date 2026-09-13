# Implementation Plan: Finance Product Split and 876 Commerce Base

**Run ID:** `2026-09-13-finance-product-split`
**Branches:** changes are made in the shared checkout on disjoint paths and split
into PR branches by path (no worktrees).
**Status:** IN_PROGRESS
**Decision:** [ADR 025](../../docs/architecture/025-finance-and-commerce-product-lineup.md) · rule `.claude/rules/product-lineup.md`

## Objectives

1. **876 Commerce base setup.** An `apps/commerce` Next.js org-workspace app,
   an `apps/commerce-api` Express service skeleton, a `@876/commerce` SDK, and
   platform registration. There are no storefront, cart or catalog features yet.
2. **876 Books.** A new `apps/books` app that receives Billing's accounting
   surfaces: banking, expenses, vendors, purchases, payroll, sales orders,
   ledger/accounting reports.
3. **Strip 876 Billing** to subscription management: plans, prices,
   subscriptions, customers, the invoices/payments subscriptions produce, and
   subscription settings.

All three apps keep using `apps/billing-api`. No financial data moves.

## Decisions (user, 2026-09-13)

- Create 876 Books now rather than hiding features.
- Commerce = app + service skeleton (health only) + SDK shell.
- Let the Sales Orders run on `feature/billing-commercial-engine` finish in
  Billing, then move its screens into Books during the split.

## Sequencing

| Step | Work                               | Depends on                         |
| ---- | ---------------------------------- | ---------------------------------- |
| A    | Commerce skeleton (Codex)          | none; disjoint from `apps/billing` |
| B    | Finish, verify and PR Sales Orders | Codex pass 2 on the other run      |
| C    | Books app + strip Billing (Codex)  | B merged or stacked on it          |

## Briefs

| Tool  | Brief                                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| codex | [2026-09-13-commerce-base-setup.md](./briefs/codex/2026-09-13-commerce-base-setup.md) |

## Reports

| Tool  | Report    |
| ----- | --------- |
| codex | _pending_ |

## Checklist

- [ ] A. Commerce skeleton implemented
- [ ] A. Commerce verified by orchestrator, then committed and PR'd
- [ ] B. Sales Orders PR opened
- [ ] C. Books split brief written
- [ ] C. Books app created, Billing stripped, verified, PR'd
- [ ] `finance-app-parity.md` rewritten for Invoice ⊂ Books + Billing

## Draft Books/Billing classification (from `packages/billing/src/navigation.ts`, 2026-09-13)

| Current Billing nav entry | Stays in Billing | Moves to Books | Notes |
| --- | --- | --- | --- |
| Home | ✓ (subscription metrics) | ✓ (own accounting home) | separate dashboards |
| Customers, Items | ✓ | ✓ | shared panels, same records |
| Quotes, Invoices, Payments Received, Credit Notes | ✓ | ✓ | subscription invoicing needs them in Billing |
| Sales Orders | | ✓ | move after the Sales Orders PR merges |
| Sales Receipts, Recurring Invoices | | ✓ | Billing's recurring engine is subscriptions |
| Subscriptions, Products, Plans, Add-ons, Prices, Coupons, Price Lists | ✓ | | Price Lists are also needed by Books sales documents: confirm |
| Purchases (Vendors, Expenses), Banking, Payroll | | ✓ | |
| Reports | subscription reports | accounting reports | split report catalog |
| Settings | subscription/org settings | accounting/banking/tax settings | split settings groups |

Open for the Books brief: module keys and permission catalog for `876-books`,
provisioning/entitlement for orgs that currently use those Billing features
(pre-launch, no real data), and whether Books replaces Invoice's upsell path.

## Handoff

Commerce brief dispatched. The Books split has not started; it waits on the
Sales Orders branch.
