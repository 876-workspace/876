import { z } from 'zod'

import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AppBillingStats,
  AppBillingStatsDetail,
  PlanBillingStats,
  PlanSubscriberSummary,
} from '../types'

const appBillingStatsShape = {
  object: z.literal('app_billing_stats'),
  sourceAppId: z.string(),
  activeSubscriptions: z.number(),
  trialingSubscriptions: z.number(),
  canceledSubscriptions: z.number(),
  customerCount: z.number(),
  monthlyRecurringRevenue: z.string(),
  currency: z.string(),
  invoicedTotal: z.string(),
  paidTotal: z.string(),
  outstandingTotal: z.string(),
}

const AppBillingStatsSchema = z.strictObject(
  appBillingStatsShape
) satisfies z.ZodType<AppBillingStats>

const PlanSubscriberSummarySchema = z.strictObject({
  object: z.literal('plan_subscriber'),
  subscriptionId: z.string(),
  externalReference: z.string().nullable(),
  customerId: z.string(),
  customerName: z.string(),
  status: z.string(),
  startAt: z.number().nullable(),
  currentPeriodEnd: z.number().nullable(),
  monthlyRecurringRevenue: z.string(),
}) satisfies z.ZodType<PlanSubscriberSummary>

const PlanBillingStatsSchema = z.strictObject({
  object: z.literal('plan_billing_stats'),
  planId: z.string(),
  code: z.string(),
  name: z.string(),
  entitlementReferenceId: z.string().nullable(),
  activeSubscriptions: z.number(),
  trialingSubscriptions: z.number(),
  monthlyRecurringRevenue: z.string(),
  subscribers: z.array(PlanSubscriberSummarySchema),
}) satisfies z.ZodType<PlanBillingStats>

const AppBillingStatsDetailSchema = z.strictObject({
  ...appBillingStatsShape,
  plans: z.array(PlanBillingStatsSchema),
}) satisfies z.ZodType<AppBillingStatsDetail>

const AppBillingStatsListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(AppBillingStatsSchema),
})

/** `$billing.stats.*` — secret-service Billing reporting. */
export function createAdminStatsResource(runtime: AdminRuntime) {
  return {
    apps: {
      /** Lists financial rollups for core 876 apps. */
      list() {
        return AdminRequest(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/admin/stats/apps',
          },
          AppBillingStatsListSchema
        )
      },

      /** Retrieves one app's financial and per-plan Billing rollup. */
      retrieve(sourceAppId: string) {
        return AdminRequest(
          runtime,
          {
            method: 'GET',
            path: `/api/v1/admin/stats/apps/${encodeURIComponent(sourceAppId)}`,
          },
          AppBillingStatsDetailSchema
        )
      },
    },
  }
}
