import { z } from 'zod'

import type {
  ProrationPreview,
  SubscriptionCreated,
  UpcomingInvoice,
} from './subscription'
import { createdResourceSchema } from './common.schema'

/**
 * The schema for a created subscription response.
 */
export const SubscriptionCreatedSchema = createdResourceSchema(
  'subscription'
) satisfies z.ZodType<SubscriptionCreated>

const UpcomingInvoiceLineSchema = z.object({
  object: z.literal('upcoming_invoice_line'),
  kind: z.enum(['RECURRING', 'ONE_TIME']),
  subscriptionItemId: z.string().min(1).nullable(),
  subscriptionChargeId: z.string().min(1).nullable(),
  priceId: z.string().min(1).nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  discountAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
})

/**
 * The schema for an upcoming invoice preview.
 */
export const UpcomingInvoiceSchema = z.object({
  object: z.literal('upcoming_invoice'),
  subscriptionId: z.string().min(1),
  customer: z.object({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  currency: z.string(),
  scheduledFor: z.number().int().nullable(),
  servicePeriodStart: z.number().int().nullable(),
  servicePeriodEnd: z.number().int().nullable(),
  subtotalAmount: z.string(),
  discountAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  lines: z.array(UpcomingInvoiceLineSchema),
}) satisfies z.ZodType<UpcomingInvoice>

/**
 * The schema for a proration preview.
 */
export const ProrationPreviewSchema = z.object({
  object: z.literal('proration_preview'),
  error: z.string().nullable(),
  subscriptionId: z.string().optional(),
  currency: z.string().optional(),
  changeAt: z.number().int().optional(),
  periodStart: z.number().int().optional(),
  periodEnd: z.number().int().optional(),
  oldPeriodAmount: z.string().optional(),
  newPeriodAmount: z.string().optional(),
  unusedCredit: z.string().optional(),
  remainingCharge: z.string().optional(),
  netAmount: z.string().optional(),
  adjustment: z.enum(['INVOICE', 'CREDIT_NOTE', 'NONE']).optional(),
}) satisfies z.ZodType<ProrationPreview>
