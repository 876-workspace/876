# Implementation Plan: CRM requests inside 876 Invoice and 876 Billing

- **Run ID:** `2026-09-12-crm-requests-in-finance-apps`
- **Branch:** `feat/crm-requests-in-finance-apps` (from `main`)
- **Status:** COMPLETED ✅

## Overview

An organization using 876 Invoice or 876 Billing must be able to raise and work
**CRM requests for its own customers** without leaving the finance app, and to
tie a request to the financial record it is about — an invoice, a payment, a
quote, a credit note. The request is written into **that organization's own CRM
tenant**, so it is one record whether it was opened in Invoice, Billing, CRM, or
Console.

## The two planes — do not conflate them

| Plane                           | Client             | Direction                 | Tenant it lands in    | Console surface                     |
| ------------------------------- | ------------------ | ------------------------- | --------------------- | ----------------------------------- |
| **Support** (exists, untouched) | `@876/crm/support` | an org → 876              | Efesto's CRM tenant   | `/orgs/[slug]/support`              |
| **Org requests** (this run)     | `@876/crm/service` | an org → its own customer | that org's CRM tenant | `/workspace/[orgSlug]/crm/requests` |

The finance apps already ship the support widget. It stays exactly as it is.

## Key design decisions

1. **The billing customer is the CRM customer.** `CustomerProfile` is unique on
   `(tenantId, billingCustomerId)` and `customers.list` already ensures a profile
   per registry customer. A finance app holds a `cust_…` registry id; a CRM
   request needs the profile id. **Resolve it in the owning service** — add a
   `billingCustomerId` filter to CRM's customers list rather than listing all
   customers and finding client-side.
2. **Related resource, not a second request type.** A request optionally carries
   `relatedResourceType` (`invoice` | `payment` | `quote` | `credit-note`),
   `relatedResourceId`, and a small display snapshot so the CRM record renders
   without calling Billing. Snapshot, per `billing-data-plane.md`: a finalized
   record must not re-derive from live rows.
3. **Console needs no new capability.** The row is in the org's CRM tenant, so
   the existing operator surfaces already show it. Only the source app and the
   related resource are new columns to render.
4. **Shared UI lives in `@876/crm-ui`.** CRM owns its screens; Invoice, Billing,
   CRM, and Console host them. No copy in any app.
5. **No CRM tenant is a real state.** An org without CRM gets an honest,
   non-blocking empty state with an activation path for an admin — never a crash
   and never `/no-access`.

## Phases

- [x] **A — CRM API.** Per-app `requireServiceApp` guard on `CRM_SERVICE_KEYS`;
      `billingCustomerId` resolution; `/billing-customers/:id/requests`;
      related-resource + `sourceApp` columns (additive migration, applied).
- [x] **B — `@876/crm` client.** Service-key transport, `listForBillingCustomer`,
      `createForBillingCustomer`, related-resource contracts.
- [x] **C — `@876/crm-ui`.** Split-view shell, record card, composer, tasks,
      related-requests panel.
- [x] **D/F/G — Invoice + Billing.** Server-rendered request list, split view,
      Overview/Tasks/Activity, invoice + payment related requests.
- [x] **E/H — CRM app + Console.** Live CRM tab; Console request attribution.

## Dispatched briefs

| Delegate | Brief                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| codex    | [phases A–E](./briefs/codex/2026-09-12-crm-requests-in-finance-apps.md)            |
| codex    | [D/E blockers + tests](./briefs/codex/2026-09-12-phase-d-e-and-tests.md)           |
| codex    | [F — full request UX](./briefs/codex/2026-09-12-phase-f-full-request-ux.md)        |
| codex    | [G — remaining gaps](./briefs/codex/2026-09-12-phase-g-remaining-gaps.md)          |
| codex    | [H — Console + owed tests](./briefs/codex/2026-09-12-phase-h-console-and-tests.md) |

Report: [codex](./reports/codex/2026-09-12-crm-requests-in-finance-apps.md)

## Orchestrator corrections to delegated work

- Billing guards moved from `requests.*` to Billing's live `customers:read` /
  `customers:write`: Billing is not yet on the app-access plane, so nothing
  granted `requests.*` there and every Billing user would have hit `/no-access`.
- `getCrm()` no longer throws on missing env; routes use `safeParse`, the
  registered `crm/invalid-request`, and `supportResponseStatus` — failures had
  surfaced as an HTML 500 ("invalid response").
- Removed `bleed` from the request shell (doubled padding inside the customer card).
- Request list server-rendered instead of a `useEffect` fetch (data-loading rule);
  placeholder Overview page removed.
- Console pinned permission counts and layout placeholder tests updated.

## Operational changes (outside git)

- Vercel: `CRM_SERVICE_KEYS` / `CRM_SUPPORT_SERVICE_KEYS` on `876-crm-api`;
  `CRM_SERVICE_APP` / `CRM_SERVICE_KEY` on invoice, billing, crm, console;
  `CRM_SUPPORT_SERVICE_KEY` on invoice and billing. All three environments.
- Redeployed `876-crm-api`, `876-invoice`, `876-billing` — fixes the support
  widget, which returned 401 in production because its keys were never set.
- CRM migration `20260912000000_request_related_resource` applied to the `crm`
  database (additive, nullable).

## Follow-ups

- After merge: run `pnpm --filter @876/api seed` so `requests.*` reach the
  production app-access catalog and roles; deploy crm-api before the apps.
- Billing migration onto the app-access plane will switch its guards to `requests.*`.
- Pre-existing `app-name-symbol-prefix` violation (`ConsoleHome`) is on `main`.

## Verification

```bash
pnpm --filter @876/crm-api typecheck && pnpm --filter @876/crm-api lint \
  && pnpm --filter @876/crm-api boundaries && pnpm --filter @876/crm-api test
pnpm --filter @876/crm test && pnpm --filter @876/crm-ui test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

## Handoff state

Complete. Verified: typecheck clean in crm, crm-ui, crm-api, invoice, billing,
crm-app, console; lint clean on changed files; tests crm-api 783, crm 247,
crm-ui 25, core 1,098, api 2,280, invoice 557, billing 963, crm-app 303,
console 1,782.
