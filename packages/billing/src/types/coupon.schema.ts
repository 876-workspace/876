import { z } from 'zod'

import type { Coupon, CouponDeleted } from './coupon'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

/**
 * The schema for a created coupon response.
 */
export const CouponCreatedSchema = createdResourceSchema('coupon')

/**
 * The schema for a deleted coupon tombstone.
 */
export const CouponDeletedSchema = deletedResourceSchema(
  'coupon'
) satisfies z.ZodType<CouponDeleted>

/**
 * The schema for a coupon resource.
 */
export const CouponSchema = z.object({
  object: z.literal('coupon'),
  id: z.string().min(1),
  name: z.string(),
  productId: z.string().nullable(),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  percentOff: z.string().nullable(),
  amountOff: z.string().nullable(),
  currency: z.string().nullable(),
  duration: z.enum(['ONCE', 'REPEATING', 'FOREVER']),
  durationInCycles: z.number().int().nullable(),
  redeemBy: z.number().int().nullable(),
  maxRedemptions: z.number().int().nullable(),
  maxRedemptionsPerCustomer: z.number().int().nullable(),
  discountPreference: z.enum(['INVOICE_LEVEL', 'ITEM_LEVEL']),
  appliesToAllPlans: z.boolean(),
  appliesToAllRecurringAddons: z.boolean(),
  appliesToAllOneTimeAddons: z.boolean(),
  eligibleForAllCustomers: z.boolean(),
  timesRedeemed: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Coupon>

/**
 * The schema for a paginated list of coupons.
 */
export const CouponListSchema = listSchema(CouponSchema)
