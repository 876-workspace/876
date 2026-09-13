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

- [x] A. Commerce skeleton implemented
- [x] A. Commerce verified by orchestrator and committed on `feature/commerce-base`; onboarding pass added
- [ ] B. Sales Orders PR opened
- [ ] C. Books split brief written
- [ ] C. Books app created, Billing stripped, verified, PR'd
- [ ] `finance-app-parity.md` rewritten for Invoice ⊂ Books + Billing

## Draft Books/Billing classification (from `packages/billing/src/navigation.ts`, 2026-09-13)

| Current Billing nav entry                                             | Stays in Billing          | Moves to Books                  | Notes                                                         |
| --------------------------------------------------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------------- |
| Home                                                                  | ✓ (subscription metrics)  | ✓ (own accounting home)         | separate dashboards                                           |
| Customers, Items                                                      | ✓                         | ✓                               | shared panels, same records                                   |
| Quotes, Invoices, Payments Received, Credit Notes                     | ✓                         | ✓                               | subscription invoicing needs them in Billing                  |
| Sales Orders                                                          |                           | ✓                               | move after the Sales Orders PR merges                         |
| Sales Receipts, Recurring Invoices                                    |                           | ✓                               | Billing's recurring engine is subscriptions                   |
| Subscriptions, Products, Plans, Add-ons, Prices, Coupons, Price Lists | ✓                         |                                 | Price Lists are also needed by Books sales documents: confirm |
| Purchases (Vendors, Expenses), Banking, Payroll                       |                           | ✓                               |                                                               |
| Reports                                                               | subscription reports      | accounting reports              | split report catalog                                          |
| Settings                                                              | subscription/org settings | accounting/banking/tax settings | split settings groups                                         |

Open for the Books brief: module keys and permission catalog for `876-books`,
provisioning/entitlement for orgs that currently use those Billing features
(pre-launch, no real data), and whether Books replaces Invoice's upsell path.

## Production setup (2026-09-13, orchestrator)

- Seeded `876-commerce` (bootstrap, appAccess, internalPlan, defaultPrices) in the shared core DB. App id is `rap_3a29b921ed9a4391aff073c567e7761c`.
- Minted the `876-commerce production` API key and stored it only as `COMMERCE_API_876_KEY` in Vercel and local `apps/commerce/.env`.
- Vercel projects: `876-commerce` (`prj_2jUGdi2Z6Hhj88btCgsyHnO0CZI9`) and `876-commerce-api` (`prj_bnpcFua3h55WtHap3smoWwTh4swT`), with SSO protection off and env vars set.
- Added `https://876-commerce.vercel.app` to prod `CORS_ALLOWED_ORIGINS`, and redeployed 876-api.
- Registered `https://876-commerce.vercel.app/callback` as a WorkOS redirect URI (the environment of the local `sk_test_` key).
- Deployed both. `/health`, `/ready` and `/login` answer, and social login returns the app's own `/callback`.
- No database was created: `commerce-api` has no persistence yet.
- Pre-existing gap found: prod CORS does not allow billing, invoice, crm or console origins.

## Handoff

Commerce brief dispatched. The Books split has not started; it waits on the
Sales Orders branch.
