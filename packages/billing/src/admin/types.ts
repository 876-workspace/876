import type { Error, MinorAmount, Result, SubscriptionStatus } from '../types'

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

/** Options for the server-only Billing administration client. */
export interface AdminClientOptions {
  /** Billing API origin. Defaults from `BILLING_API_URL` (or legacy `BILLING_URL`). */
  baseUrl?: string
  /** Secret server-to-server key. Never expose this value to a browser. */
  internalKey?: string
  /** Optional fetch implementation for tests or custom runtimes. */
  fetch?: typeof fetch
  /** Optional request ID propagated to Billing logs. */
  requestId?: string
}

/** Minimal acknowledgement returned by an idempotent ensure operation. */
export interface Ensured<
  TObject extends 'product' | 'plan' | 'price' | 'customer' | 'subscription',
> {
  object: TObject
  id: string
}

export interface ProductEnsureParams {
  /** Opaque core app ID (`rap_...`) mirrored by the Billing product. */
  sourceAppId: string
  slug: string
  name: string
  description?: string | null
  active?: boolean
}

export interface PlanEnsureParams {
  /** Billing product ID returned by `$billing.products.ensure()`. */
  productId: string
  /** Opaque core plan-tier ID (`prd_...`). */
  entitlementReferenceId: string
  code: string
  name: string
  description?: string | null
  intervalUnit: IntervalUnit
  intervalCount?: number
  trialDays?: number
  active?: boolean
}

export interface PriceEnsureParams {
  /** Billing plan ID returned by `$billing.plans.ensure()`. */
  planId: string
  /** Opaque core price ID (`prc_...`). */
  entitlementReferenceId: string
  nickname?: string | null
  currency: string
  unitAmount: MinorAmount
  intervalUnit: IntervalUnit
  intervalCount?: number
  active?: boolean
}

export interface CustomerEnsureParams {
  customerType?: 'CORE_ORGANIZATION' | 'CORE_USER'
  /** Opaque core organization ID (`org_...`). */
  organizationId?: string
  /** Opaque core user ID. */
  userId?: string
  name: string
  email?: string | null
}

/** Financial rollup for subscriptions attributed to one core 876 app. */
export interface AppBillingStats {
  /** String representing the object's type. Always `app_billing_stats`. */
  object: 'app_billing_stats'
  /** Core 876 app id this rollup covers. */
  sourceAppId: string
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  /** Distinct customers holding any subscription for this app. */
  customerCount: number
  /** Normalized monthly recurring revenue in minor units, as a decimal string. */
  monthlyRecurringRevenue: string
  /** Tenant default currency the amounts are reported in. */
  currency: string
  /** Sum of finalized (non-DRAFT, non-VOID) invoice totals for this app's subscriptions. */
  invoicedTotal: string
  /** Portion of invoicedTotal already paid. */
  paidTotal: string
  /** invoicedTotal - paidTotal (open AR attributable to this app). */
  outstandingTotal: string
}

/** Recent subscriber summary within a plan rollup. */
export interface PlanSubscriberSummary {
  object: 'plan_subscriber'
  subscriptionId: string
  /** Core subscription id when mirrored from core, else null. */
  externalReference: string | null
  customerId: string
  customerName: string
  status: string
  startAt: number | null
  currentPeriodEnd: number | null
  monthlyRecurringRevenue: string
}

/** Subscriber and recurring-revenue rollup for one Billing plan. */
export interface PlanBillingStats {
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

/** App financial rollup with its per-plan subscriber breakdowns. */
export interface AppBillingStatsDetail extends AppBillingStats {
  plans: PlanBillingStats[]
}

export interface SubscriptionEnsureParams {
  /** Opaque core subscription ID (`sub_...`) used as the idempotency key. */
  externalReference: string
  sourceAppId?: string | null
  /** Billing customer ID returned by `$billing.customers.ensure()`. */
  customerId: string
  items: Array<{
    /** Opaque core price ID resolved by Billing. */
    priceEntitlementReferenceId: string
    quantity?: number
  }>
  status?: SubscriptionStatus
  startAt?: number
  cancelAtPeriodEnd?: boolean
}

export type AdminError = Error
export type AdminResult<T> = Result<T>
