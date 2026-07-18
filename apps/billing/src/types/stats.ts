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
