import { z } from 'zod'

import type { List } from './common'
import { createdResourceSchema, listSchema } from './common.schema'
import type { Refund, RefundCreated } from './refund'

/** The schema for a refund resource returned after creation. */
export const RefundCreatedSchema = createdResourceSchema(
  'refund'
) satisfies z.ZodType<RefundCreated>

/** The schema for a refund. Mirrors the Billing API's `serializeRefund`. */
export const RefundSchema = z.strictObject({
  object: z.literal('refund'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  creditNoteId: z.string().min(1).nullable(),
  paymentId: z.string().min(1).nullable(),
  paymentModeId: z.string().min(1).nullable(),
  depositAccountId: z.string().min(1).nullable(),
  number: z.string().min(1),
  amount: z.string().regex(/^(0|[1-9]\d*)$/),
  currency: z.string().min(1),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  refundedAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Refund>

/** The schema for a list of refunds. */
export const RefundListSchema = listSchema(RefundSchema) satisfies z.ZodType<
  List<Refund>
>
