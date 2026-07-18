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
| `POST /api/billing/subscriptions`                                | `mirrorCoreSubscription`                               |
| `PATCH` / `DELETE` `/api/billing/subscriptions/[subscriptionId]` | `mirrorCoreSubscription`                               |
| `POST` / `PATCH` / `DELETE` subscription items                   | `mirrorCoreSubscriptionById`                           |
| `POST /api/organizations/[id]/apps`                              | `mirrorCoreSubscription`                               |
| `PATCH /api/organizations/[id]/apps/[appId]`                     | `mirrorCoreSubscription`                               |
| `POST /api/billing/mirror/reconcile`                             | `reconcileBillingMirror` (full catalog + all org subs) |

Products without `app_id` are skipped (`mirrorCoreProductPrices` returns
`false`).

---

## Ensure schemas

Source: `apps/billing/src/types/sync.ts`. Posted via `@876/billing/admin`
(`$billing.products.ensure`, `.plans.ensure`, `.prices.ensure`,
`.customers.ensure`, `.subscriptions.ensure`).

### Product

```ts
// ProductEnsureSchema
{
  sourceAppId: string
  slug: string            // /^[a-z0-9-]{2,80}$/
  name: string            // 1–160
  description?: string | null
  active: boolean         // default true
}
```

### Plan

```ts
// PlanEnsureSchema
{
  productId: string
  entitlementReferenceId: string  // core product id
  code: string                    // /^[A-Za-z0-9_-]{2,100}$/
  name: string
  description?: string | null
  intervalUnit: IntervalUnit
  intervalCount: number           // 1–3650, default 1
  trialDays: number               // 0–3650, default 0
  active: boolean
}
```

### Price

```ts
// PriceEnsureSchema
{
  planId: string
  entitlementReferenceId: string  // core price id
  nickname?: string | null
  currency: string                // ISO 4217
  unitAmount: number              // minor units
  intervalUnit: IntervalUnit
  intervalCount: number
  active: boolean
}
```

### Customer (also used by Core outbox)

```ts
// CustomerEnsureSchema
{
  customerType: 'CORE_ORGANIZATION' | 'CORE_USER'
  organizationId?: string
  userId?: string
  name: string
  email?: string | null
}
```

### Subscription

```ts
// SubscriptionEnsureSchema
{
  externalReference: string       // core subscription id
  sourceAppId?: string | null
  customerId: string              // Billing customer id
  items: Array<{
    priceEntitlementReferenceId: string  // core price id
    quantity: number                     // default 1
  }>  // 1–100
  status: SubscriptionStatus      // default ACTIVE
  startAt?: number                // unix seconds
  cancelAtPeriodEnd: boolean
}
```

---

## Reconcile route

```http
POST /api/billing/mirror/reconcile
```

- Console Next.js route: `apps/console/src/app/api/billing/mirror/reconcile/route.ts`
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
// withBillingSyncHeader
response.headers.set(
  'x-876-billing-sync',
  succeeded ? 'succeeded' : 'pending-reconciliation'
)
```

| Value                    | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `succeeded`              | All ensure steps for that mutation completed                   |
| `pending-reconciliation` | One or more ensure steps failed; repair via retry or reconcile |

---

## Client surface

```ts
// packages/billing/src/admin/client.ts
create876AdminClient({
  /* baseUrl, internalKey — server-only */
}).products.ensure / .plans.ensure / .prices.ensure /
  .customers.ensure / .subscriptions.ensure /
  .stats.apps.list / .stats.apps.retrieve
```

Console singleton: `$billing` from `apps/console/src/lib/billing`.
