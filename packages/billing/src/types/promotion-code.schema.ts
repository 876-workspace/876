import { z } from 'zod'

import type { PromotionCode } from './promotion-code'
import { createdResourceSchema, listSchema } from './common.schema'

/**
 * The schema for a created promotion code response.
 */
export const PromotionCodeCreatedSchema =
  createdResourceSchema('promotion_code')

/**
 * The schema for a promotion code resource.
 */
export const PromotionCodeSchema = z.object({
  object: z.literal('promotion_code'),
  id: z.string().min(1),
  couponId: z.string().min(1),
  code: z.string(),
  customerId: z.string().nullable(),
  expiresAt: z.number().int().nullable(),
  maxRedemptions: z.number().int().nullable(),
  timesRedeemed: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<PromotionCode>

/**
 * The schema for a paginated list of promotion codes.
 */
export const PromotionCodeListSchema = listSchema(PromotionCodeSchema)
