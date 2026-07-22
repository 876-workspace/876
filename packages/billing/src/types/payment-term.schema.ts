import { z } from 'zod'

import type { PaymentTerm } from './payment-term'
import { createdResourceSchema, listSchema } from './common.schema'

/**
 * The schema for a created payment term response.
 */
export const PaymentTermCreatedSchema = createdResourceSchema('payment_term')

/**
 * The schema for a payment term resource.
 */
export const PaymentTermSchema = z.object({
  object: z.literal('payment_term'),
  id: z.string().min(1),
  name: z.string(),
  rule: z.enum([
    'DUE_ON_RECEIPT',
    'NET_DAYS',
    'END_OF_MONTH',
    'END_OF_NEXT_MONTH',
  ]),
  dueDays: z.number().int(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentTerm>

/**
 * The schema for a paginated list of payment terms.
 */
export const PaymentTermListSchema = listSchema(PaymentTermSchema)
