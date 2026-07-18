# Console ↔ Billing Integration

Implementation record for dogfooding 876 Billing as the platform money plane
from Console and Core. Control-plane catalog and entitlements remain in Core
(`apps/api`); commercial customers, catalog mirrors, subscriptions, invoices,
and ledger live in Billing (`apps/billing`) under the platform tenant
(`BILLING_PLATFORM_TENANT_SLUG`, currently `efesto-billing`).

Related:

- [Plan & subscription model](../plan-and-subscription-model.md)
- [Tenant provisioning](../tenant-provisioning.md)
- [Customer sync](../billing-customer-sync.md)
- [Catalog sync](../billing-catalog-sync.md)
- [Billing stats](../billing-stats.md)
- [Lifecycle, trials, accounts](../billing-lifecycle-trials-and-accounts.md)

---

## Goal

Every 876 organization and every user (consumer or enterprise) automatically
becomes a customer of the platform Billing tenant. Console remains the
application/control plane; Billing remains the money plane. Core stays the
source of truth for identity and entitlement subscriptions.

---

## Current-state findings (pre-implementation)

| Area              | Finding                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog mirror    | Console already mirrored products/prices/subscriptions into Billing via `@876/billing/admin` ensure helpers (`apps/console/src/lib/billing/mirror.ts`).                 |
| Customer creation | Gap: org/user customers were not durably ensured from Core on provision/signup; only opportunistic ensure during subscription mirror.                                   |
| Stats             | Console app detail tiles were hard-coded / zeros; Billing had no per-app rollup API.                                                                                    |
| Scheduler         | No Core-driven billing-run trigger; subscription invoices required manual Billing UI or ad-hoc admin calls.                                                             |
| Data drift        | Legacy `blplan_*` duplicates (including typo code `inrernal`), subscriptions with dangling source apps, live 876 Billing sub not linked via `entitlement_reference_id`. |

---

## Architecture — three sync lanes

All lanes are idempotent and keyed on opaque core IDs.

| Lane                  | Driver                | Durability                            | Destination                                                                                            |
| --------------------- | --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Catalog**           | Console (synchronous) | Log-don't-throw; repair via reconcile | Billing products / plans / prices / subscriptions                                                      |
| **Customer**          | Core (durable outbox) | `billing_customer_outbox` + worker    | `POST /api/v1/admin/customers/ensure`                                                                  |
| **Finance workspace** | Core (pre-existing)   | `finance_provisioning_outbox`         | `POST /api/v1/admin/finance-connections/ensure` — see [tenant-provisioning](../tenant-provisioning.md) |

Core also POSTs `{BILLING_URL}/api/v1/admin/billing/run` on
`BILLING_RUN_INTERVAL_SECONDS` (default `3600`, `0` disables).

---

## Decisions

| ID     | Decision                                                                                                                                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | Console owns catalog/subscription mirror; Core owns customer ensure + billing-run cadence.                                                                                                                           |
| **D2** | Customer lane is durable outbox (`customer.ensure`), not best-effort HTTP from signup.                                                                                                                               |
| **D3** | Orgs → `CORE_ORGANIZATION` / `BUSINESS`; users → `CORE_USER` / `INDIVIDUAL`. Dedupe on `(tenantId, organizationId)` / `(tenantId, userId)`.                                                                          |
| **D4** | Mapping: billing product ← core app (`sourceAppId`, slug); plan.`entitlementReferenceId` = core product id; price.`entitlementReferenceId` = core price id; subscription.`externalReference` = core subscription id. |
| **D5** | Catalog mirror failures never fail core writes (log + `x-876-billing-sync` header).                                                                                                                                  |
| **D6** | Stats via internal-key Billing admin (`GET /api/v1/admin/stats/apps*`); Console degrades to zeros when unreachable.                                                                                                  |
| **D7** | Trials are Zoho/Lago-style: no invoice at trial start; first invoice at trial end when sweep bills due `TRIALING`/`ACTIVE`. `$0` invoices auto-`PAID`. Not Stripe's `$0`-at-trial-start model.                       |
| **D8** | Items stay a single tenant pool with `sourceAppId` attribution + list filter (Zoho-style filtered views, not per-app silos).                                                                                         |

---

## Implementation batches

### Batch 1 — Billing app: customer ensure + items filter

- `apps/billing/src/types/sync.ts` — `CustomerEnsureSchema` and catalog ensure schemas
- `apps/billing/src/lib/service/customers/ensure.ts` — idempotent ensure
- Items list `sourceAppId` query param (`apps/billing/src/app/api/billing/items/route.ts`, `lib/service/items/list.ts`)

### Batch 2 — Billing stats

- `apps/billing/src/types/stats.ts` — `AppBillingStats`, `PlanBillingStats`, …
- `apps/billing/src/lib/service/stats/apps.ts`, `mrr.ts`
- Routes: `GET /api/v1/admin/stats/apps`, `GET /api/v1/admin/stats/apps/{sourceAppId}`

### Batch 3 — Core outbox, worker, routes, hooks

- Model: `apps/api/db/models/billing_customer_sync.py` (`billing_customer_outbox`)
- Enqueue: `apps/api/services/billing_customer_sync.py`
- Dispatch/worker/billing-run: `apps/api/services/billing_customer_dispatch.py`
- Admin routes: `POST /billing/customer-sync/dispatch`, `POST /billing/customer-sync/reconcile` (`AdminDep`)
- Emit: org provision (`services/provisioning.py`); user create paths in `services/auth.py`, `POST /users/ensure`, admin user create (`domains/users/router.py`)
- Lifespan starts worker when `BILLING_URL` + `BILLING_INTERNAL_KEY` set (`main.py`)

### Batch 4 — Admin client + Console wiring + reconcile

- `@876/billing/admin`: `$billing.stats.apps.list()` / `.retrieve()`; customer/plan/price/product/subscription ensure surface
- Console mirror + `POST /api/billing/mirror/reconcile` (permission `console:organizations`)
- App detail + plan subscribers pages consume stats

---

## Data cleanup performed

- Deactivated legacy `blplan_*` plan duplicates (including typo code `inrernal`)
- Canceled two subscriptions with dangling source apps
- Linked the live 876 Billing subscription to core via plan `entitlement_reference_id`

---

## Follow-ups

| Priority | Item                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| P1       | Bidirectional entitlement webhooks (Billing status → Core subscription status)       |
| P2       | Per-currency stats reporting (today: tenant default currency only)                   |
| P2       | Move catalog mirror into Core outbox (same durability as customers)                  |
| P3       | Optional Stripe provider mirroring for external collection                           |
| P3       | Drop remaining Console best-effort customer ensure once Core outbox covers all paths |
