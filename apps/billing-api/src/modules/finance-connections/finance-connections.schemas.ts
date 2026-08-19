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

export const billingAppStatsSchema = z.object({
  object: z.literal('billing_app_stats'),
  sourceAppId: z.string().nullable(),
  connections: z.number().int(),
  customers: z.number().int(),
  invoices: z.number().int(),
  subscriptions: z.number().int(),
})
