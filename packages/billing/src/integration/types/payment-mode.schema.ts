import { z } from 'zod'

import type { BillingPaymentMode, BillingPaymentModeList } from './payment-mode'

/**
 * The schema for a Billing payment mode resource.
 */
export const BillingPaymentModeSchema = z.strictObject({
  object: z.literal('payment_mode'),
  id: z.string().min(1),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingPaymentMode>

/**
 * The schema for a paginated list of Billing payment modes.
 */
export const BillingPaymentModeListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingPaymentModeSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingPaymentModeList>
