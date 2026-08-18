# Billing Catalog & Subscription Mirror

Console-driven synchronous projection of Core entitlement catalog and org
subscriptions into the platform Billing tenant. Core remains source of truth
for products, prices, and entitlement subscriptions; Billing holds commercial
plans, prices, customers, and agreements.

Related: [plan model](plan-and-subscription-model.md),
[customer sync](billing-customer-sync.md),
[implementation plan](plans/console-billing-integration.md).

---

## Mapping

| Core entity         | Billing entity    | Idempotency / link key                                                      |
| ------------------- | ----------------- | --------------------------------------------------------------------------- |
| App                 | Product           | `sourceAppId` + product `slug` (app slug)                                   |
| Product (plan tier) | Plan              | `entitlementReferenceId` = core `product.id`; `code` = core `product.slug`  |
| Price               | Price             | `entitlementReferenceId` = core `price.id`                                  |
| Organization        | Customer (ensure) | `organizationId` (also covered by Core outbox)                              |
| Subscription        | Subscription      | `externalReference` = core `subscription.id`; `sourceAppId` = core `app_id` |
| Subscription item   | Subscription item | `priceEntitlementReferenceId` = core `price_id`                             |

Implementation: `apps/console/src/lib/billing/mirror.ts`.

Status map (core → Billing):

| Core status                        | Billing status |
| ---------------------------------- | -------------- |
| `trialing`                         | `TRIALING`     |
| `paused`, `blocked`                | `PAUSED`       |
| `canceled`                         | `CANCELED`     |
| `incomplete`, `incomplete_expired` | `DRAFT`        |
| other (`active`, …)                | `ACTIVE`       |

Cadence: core `billing_interval` / `recurring.interval` → Billing
`DAY` \| `WEEK` \| `MONTH` \| `YEAR`. Recurring prices without interval default
to monthly.

---

## When each mirror fires

Helpers: `mirrorCoreProductPrices`, `mirrorCoreSubscription`,
`mirrorCoreSubscriptionById`, `reconcileBillingMirror`.

| Console route                                                    | Mirror call                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `POST /api/products`                                             | `mirrorCoreProductPrices`                              |
| `PATCH /api/products/[id]`                                       | `mirrorCoreProductPrices`                              |
| `DELETE /api/products/[id]`                                      | `mirrorCoreProductPrices` (archive projection)         |
| `POST /api/products/[id]/prices`                                 | `mirrorCoreProductPrices` (product + new price)        |
| `PATCH` / `DELETE` `/api/products/[id]/prices/[priceId]`         | `mirrorCoreProductPrices`                              |
| `POST /api/billing-subscriptions`                                | `mirrorCoreSubscription`                               |
| `PATCH` / `DELETE` `/api/billing-subscriptions/[subscriptionId]` | `mirrorCoreSubscription`                               |
| `POST` / `PATCH` / `DELETE` subscription items                   | `mirrorCoreSubscriptionById`                           |
| `POST /api/organizations/[id]/apps`                              | `mirrorCoreSubscription`                               |
| `PATCH /api/organizations/[id]/apps/[appId]`                     | `mirrorCoreSubscription`                               |
| `POST /api/finance/reconcile`                                    | `reconcileBillingMirror` (full catalog + all org subs) |

Products without `app_id` are skipped (`mirrorCoreProductPrices` returns
`false`).

---

## Projection clients

The mirror is a Console control-plane workflow. It uses the canonical flat
`$876` resource facade where that resource is available and narrow internal
aliases from `apps/console/src/lib/876` only for Billing admin operations that
are not yet surfaced on the composed client.

Current shape:

```ts
import { $876, billingAdmin, coreAdmin } from '@/lib/876'

await billingAdmin.products.create(...)
await $876.plans.admin.create(...)
await $876.prices.admin.create(...)
await $876.customers.admin.create(...)
await billingAdmin.subscriptions.create(...)
```

Feature/browser code must not construct these service clients directly.

---

## Reconcile route

```http
POST /api/finance/reconcile
```

- Console Next.js route: `apps/console/src/app/api/finance/reconcile/route.ts`
- Auth: session + `console:organizations`
- Body: none
- Work: list all core products → `mirrorCoreProductPrices`; page all orgs → list
  subscriptions → `mirrorCoreSubscription`

Response (from `reconcileBillingMirror`):

```json
{
  "object": "billing_mirror_reconcile",
  "products": 12,
  "subscriptions": 48,
  "failures": 1
}
```

Wrapped by Console `apiSuccess` as `{ data: { … }, error: null }` depending on
envelope helper.

Use after schema drift, failed mirrors (`x-876-billing-sync:
pending-reconciliation`), or catalog seed changes. Pair customer gaps with
Core [customer-sync reconcile](billing-customer-sync.md).

---

## Log-don't-throw convention

From `apps/console/src/lib/billing/mirror.ts`:

- Mirror failures are `console.error`'d and return `false`
- They must **never** fail the Core write that triggered them
- Successful Core mutations still return 2xx with the core resource

### `x-876-billing-sync` header

```ts
response.headers.set(
  'x-876-billing-sync',
  succeeded ? 'succeeded' : 'pending-reconciliation'
)
```

| Value                    | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `succeeded`              | All projection steps for that mutation completed               |
| `pending-reconciliation` | One or more steps failed; repair via retry or reconcile         |

Browser code never calls Billing admin directly. Console mutations use its
product-owned routes such as `/api/billing-subscriptions` and
`/api/finance/reconcile`.
