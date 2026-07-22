import { z } from 'zod'

import type {
  PaymentMode,
  PaymentModeCreated,
  PaymentModeDeleted,
} from './payment-mode'
import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

/**
 * The schema for a created payment mode response.
 */
export const PaymentModeCreatedSchema = createdResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeCreated>

/**
 * The schema for a deleted payment mode tombstone.
 */
export const PaymentModeDeletedSchema = deletedResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeDeleted>

/**
 * The schema for a payment mode resource.
 */
export const PaymentModeSchema = z.strictObject({
  object: z.literal('payment_mode'),
  id: z.string().min(1),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentMode>

/**
 * The schema for a paginated list of payment modes.
 */
export const PaymentModeListSchema = listSchema(
  PaymentModeSchema
) satisfies z.ZodType<List<PaymentMode>>
