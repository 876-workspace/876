import { z } from 'zod'

import type {
  BillingItem,
  BillingItemList,
  BillingItemMedia,
  BillingItemMediaList,
  BillingItemPreferences,
  BillingItemVariant,
  BillingItemVariantList,
  DeletedBillingItem,
  DeletedBillingItemMedia,
} from './item'

/**
 * `z.object` intentionally strips additive Billing fields so integration clients
 * remain forward-compatible with new backend columns.
 */
export const BillingItemSchema = z.object({
  object: z.literal('item'),
  id: z.string().min(1),
  sourceAppId: z.string().nullable(),
  sourceExternalReference: z.string().nullable(),
  type: z.enum(['GOOD', 'SERVICE']),
  variantMode: z.enum(['single', 'variant']),
  name: z.string(),
  sku: z.string().nullable(),
  unit: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  defaultSellingAmount: z.string().nullable(),
  defaultSellingCurrency: z.string().nullable(),
  defaultCostAmount: z.string().nullable(),
  defaultCostCurrency: z.string().nullable(),
  isTaxable: z.boolean(),
  taxCode: z.string().nullable(),
  trackStock: z.boolean(),
  stockQuantity: z.number().int().nullable(),
  lowStockThreshold: z.number().int().min(0).nullable(),
  allowOutOfStock: z.boolean(),
  isActive: z.boolean(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingItem>

export const BillingItemListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingItemSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingItemList>

export const BillingItemVariantOptionSchema = z.strictObject({
  optionId: z.string().min(1),
  name: z.string().min(1),
  valueId: z.string().min(1),
  value: z.string().min(1),
  position: z.number().int().min(0),
})

export const BillingItemVariantMediaSchema = z.strictObject({
  fileId: z.string().min(1),
  position: z.number().int().min(0),
})

export const BillingItemVariantParentSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().nullable(),
  defaultSellingAmount: z.string().nullable(),
  defaultSellingCurrency: z.string().nullable(),
  defaultCostAmount: z.string().nullable(),
  defaultCostCurrency: z.string().nullable(),
  trackStock: z.boolean(),
  lowStockThreshold: z.number().int().min(0).nullable(),
  allowOutOfStock: z.boolean(),
})

export const BillingItemVariantSchema = z.strictObject({
  object: z.literal('item_variant'),
  id: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().nullable(),
  defaultSellingAmount: z.string().nullable(),
  defaultSellingCurrency: z.string().nullable(),
  defaultCostAmount: z.string().nullable(),
  defaultCostCurrency: z.string().nullable(),
  stockQuantity: z.number().int().nullable(),
  isActive: z.boolean(),
  options: z.array(BillingItemVariantOptionSchema),
  media: z.array(BillingItemVariantMediaSchema),
  item: BillingItemVariantParentSchema.optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingItemVariant>

export const BillingItemVariantListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingItemVariantSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingItemVariantList>

export const BillingItemPreferencesSchema = z.strictObject({
  object: z.literal('item_preferences'),
  productVariants: z.boolean(),
}) satisfies z.ZodType<BillingItemPreferences>

export const BillingItemMediaSchema = z.strictObject({
  object: z.literal('item_media'),
  id: z.string().min(1),
  fileId: z.string().min(1),
  position: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingItemMedia>

export const BillingItemMediaListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingItemMediaSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingItemMediaList>

export const DeletedBillingItemSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingItem>

export const DeletedBillingItemMediaSchema = z.strictObject({
  object: z.literal('item_media'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingItemMedia>
