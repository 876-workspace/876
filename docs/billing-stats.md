# Billing Stats

Internal-key financial rollups for core 876 apps, attributed via Billing
subscription `sourceAppId`. Consumed by Console app detail and plan subscriber
pages through `@876/billing/admin`.

Related: [catalog sync](billing-catalog-sync.md) (`sourceAppId` /
`entitlementReferenceId` linkage),
[implementation plan](plans/console-billing-integration.md).

---

## Endpoints

Auth: Billing admin (`requireInternalAdmin` — `x-internal-key` + platform
tenant from `BILLING_PLATFORM_TENANT_SLUG`).

| Method | Path                                     | Response                  |
| ------ | ---------------------------------------- | ------------------------- |
| `GET`  | `/api/v1/admin/stats/apps`               | List of `AppBillingStats` |
| `GET`  | `/api/v1/admin/stats/apps/{sourceAppId}` | `AppBillingStatsDetail`   |

Sources:

- `apps/billing/src/app/api/admin/stats/apps/route.ts`
- `apps/billing/src/app/api/admin/stats/apps/[sourceAppId]/route.ts`
- `apps/billing/src/lib/service/stats/apps.ts`

List envelope:

```json
{
  "object": "list",
  "data": [
    /* AppBillingStats[] */
  ]
}
```

Retrieve returns 404 when the app has neither attributed subscriptions nor a
Billing product with that `sourceAppId`.

---

## Response types

Source: `apps/billing/src/types/stats.ts`.

### `AppBillingStats`

```ts
interface AppBillingStats {
  object: 'app_billing_stats'
  sourceAppId: string
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  customerCount: number
  /** Normalized monthly recurring revenue in minor units, decimal string. */
  monthlyRecurringRevenue: string
  /** Tenant default currency for reported amounts. */
  currency: string
  /** Sum of finalized (non-DRAFT, non-VOID) invoice totals. */
  invoicedTotal: string
  /** Portion of invoicedTotal already paid. */
  paidTotal: string
  /** invoicedTotal - paidTotal (open AR for this app). */
  outstandingTotal: string
}
```

### `PlanSubscriberSummary`

```ts
interface PlanSubscriberSummary {
  object: 'plan_subscriber'
  subscriptionId: string
  /** Core subscription id when mirrored, else null. */
  externalReference: string | null
  customerId: string
  customerName: string
  status: string
  startAt: number | null
  currentPeriodEnd: number | null
  monthlyRecurringRevenue: string
}
```

### `PlanBillingStats`

```ts
interface PlanBillingStats {
  object: 'plan_billing_stats'
  planId: string
  code: string
  name: string
  /** Core product id this plan mirrors, when known. */
  entitlementReferenceId: string | null
  activeSubscriptions: number
  trialingSubscriptions: number
  monthlyRecurringRevenue: string
  /** Most recent subscribers, capped at 50. */
  subscribers: PlanSubscriberSummary[]
}
```

### `AppBillingStatsDetail`

```ts
interface AppBillingStatsDetail extends AppBillingStats {
  plans: PlanBillingStats[]
}
```

---

## MRR normalization

`apps/billing/src/lib/service/stats/mrr.ts` —
`calculateMonthlyRecurringRevenue(items)`:

1. Only `priceType === 'RECURRING'` items with a plan contribute
2. Amount = `(unitAmount ?? price.unitAmount) * quantity` (minor units)
3. Convert to annual via interval:
   - `DAY` → `amount * 365 / intervalCount`
   - `WEEK` → `amount * 52 / intervalCount`
   - `MONTH` → `amount * 12 / intervalCount`
   - `YEAR` → `amount / intervalCount`
4. Return `annualRevenue / 12n` as bigint (stringified in the API)

Recurring subscription set for app/plan MRR: status `ACTIVE` or `TRIALING`
only (`isRecurringSubscription` in `apps.ts`).

---

## Admin client

`packages/billing/src/admin/resources/stats.ts`:

```ts
$billing.stats.apps.list()
// GET /api/v1/admin/stats/apps

$billing.stats.apps.retrieve(sourceAppId)
// GET /api/v1/admin/stats/apps/{sourceAppId}
```

Composed on `create876AdminClient` (`packages/billing/src/admin/client.ts`).

---

## Console consumption

### App detail

`apps/console/src/app/(app)/apps/[slug]/page.tsx`:

- Calls `$billing.stats.apps.retrieve(app.id)`
- On error / throw: log `[console.billing.stats]` and treat as null
- Tiles: MRR (`formatMoney(monthlyRecurringRevenue, currency)`), active
  subscribers, in trial — **zeros / `$0.00` when Billing is unreachable**

### Plan subscribers

`apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/subscribers/page.tsx`:

- Loads core product by plan slug
- Retrieves app stats; matches plan with
  `plan.entitlementReferenceId === product.id`
- Maps up to 50 `subscribers` into the table (name, externalReference as
  email fallback, status, startAt, MRR)

---

## Single-currency caveat

Amounts are reported in the **tenant default currency** only
(`tenant.defaultCurrency`). Mixed-currency line items are not converted;
MRR aggregation sums minor units without FX. Multi-currency reporting is a
follow-up (see [implementation plan](plans/console-billing-integration.md)).
