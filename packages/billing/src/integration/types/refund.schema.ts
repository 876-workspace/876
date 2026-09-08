import { z } from 'zod'

import type {
  BillingRefund,
  BillingRefundCreated,
  BillingRefundList,
} from './refund'

export const BillingRefundSchema = z.strictObject({
  object: z.literal('refund'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  creditNoteId: z.string().nullable(),
  paymentId: z.string().nullable(),
  paymentModeId: z.string().nullable(),
  depositAccountId: z.string().nullable(),
  number: z.string(),
  amount: z.string(),
  currency: z.string().length(3),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  refundedAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingRefund>

export const BillingRefundCreatedSchema = z.strictObject({
  object: z.literal('refund'),
  id: z.string().min(1),
}) satisfies z.ZodType<BillingRefundCreated>

export const BillingRefundListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingRefundSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingRefundList>
