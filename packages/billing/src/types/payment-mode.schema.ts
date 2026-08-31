import { z } from 'zod'

import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
import type {
  PaymentMode,
  PaymentModeCreated,
  PaymentModeDeleted,
} from './payment-mode'

/** The schema for a created payment mode response. */
export const PaymentModeCreatedSchema = createdResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeCreated>

/** The schema for a deleted payment mode tombstone. */
export const PaymentModeDeletedSchema = deletedResourceSchema(
  'payment_mode'
) satisfies z.ZodType<PaymentModeDeleted>

/**
 * Stable public payment-mode DTO. The Billing API serializer starts from the
 * Prisma row, so backend-only fields such as tenantId are stripped here rather
 * than becoming part of the SDK contract or causing valid responses to fail.
 */
export const PaymentModeSchema = z.object({
  object: z.literal('payment_mode'),
  id: z.string().min(1),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PaymentMode>

/** The schema for a paginated list of payment modes. */
export const PaymentModeListSchema = listSchema(
  PaymentModeSchema
) satisfies z.ZodType<List<PaymentMode>>
