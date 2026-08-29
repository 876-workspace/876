import {
  financeConnectionScopeSchema,
  financeProvisioningEventSchema,
  financeProvisioningReceiptSchema,
  type FinanceProvisioningEvent,
} from '@876/server/finance-provisioning'
import { z } from 'zod'

export { financeConnectionScopeSchema, financeProvisioningEventSchema }
export type { FinanceProvisioningEvent }

/** Billing's persisted result is the shared API→Billing receipt contract. */
export const financeProvisioningResultSchema = financeProvisioningReceiptSchema

export const sourceAppParamsSchema = z.object({ sourceAppId: z.string() })
export const organizationParamsSchema = z.object({ organizationId: z.string() })

const planSubscriberSchema = z.strictObject({
  object: z.literal('plan_subscriber'),
  subscriptionId: z.string(),
  externalReference: z.string().nullable(),
  customerId: z.string(),
  customerName: z.string(),
  status: z.string(),
  startAt: z.number().int().nullable(),
  currentPeriodEnd: z.number().int().nullable(),
  monthlyRecurringRevenue: z.string(),
})

const billingAppStatsShape = {
  object: z.literal('app_billing_stats'),
  sourceAppId: z.string(),
  activeSubscriptions: z.number().int(),
  trialingSubscriptions: z.number().int(),
  canceledSubscriptions: z.number().int(),
  customerCount: z.number().int(),
  monthlyRecurringRevenue: z.string(),
  currency: z.string(),
  invoicedTotal: z.string(),
  paidTotal: z.string(),
  outstandingTotal: z.string(),
}

export const billingAppStatsSchema = z.strictObject(billingAppStatsShape)

export const billingAppStatsDetailSchema = z.strictObject({
  ...billingAppStatsShape,
  plans: z.array(
    z.strictObject({
      object: z.literal('plan_billing_stats'),
      planId: z.string(),
      code: z.string(),
      name: z.string(),
      entitlementReferenceId: z.string().nullable(),
      activeSubscriptions: z.number().int(),
      trialingSubscriptions: z.number().int(),
      monthlyRecurringRevenue: z.string(),
      subscribers: z.array(planSubscriberSchema),
    })
  ),
})
