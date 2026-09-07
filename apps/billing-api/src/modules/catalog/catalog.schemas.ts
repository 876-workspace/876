import { z } from 'zod'

import {
  AddonAssociationMutationSchema,
  AddonCloneSchema,
  AddonCreateSchema,
  AddonUpdateSchema,
} from './schemas/addon'
import {
  ItemCreateSchema,
  ItemMediaAttachSchema,
  ItemMediaReorderSchema,
  ItemStockAdjustmentSchema,
  ItemUpdateSchema,
  ItemVariantGenerateSchema,
  ItemVariantUpdateSchema,
} from './schemas/item'
import { ItemPreferencesUpdateSchema } from './schemas/item-preference'
import {
  PlanCloneSchema,
  PlanCreateSchema,
  PlanUpdateSchema,
} from './schemas/plan'
import {
  PriceListCreateSchema,
  PriceListResolveSchema,
  PriceListUpdateSchema,
} from './schemas/price-list'
import { PriceCreateSchema, PriceUpdateSchema } from './schemas/price'
import { ProductCreateSchema, ProductUpdateSchema } from './schemas/product'
import {
  PlanEnsureSchema,
  PriceEnsureSchema,
  ProductEnsureSchema,
} from './schemas/sync'

export {
  AddonAssociationMutationSchema,
  AddonCloneSchema,
  AddonCreateSchema,
  AddonUpdateSchema,
  ItemCreateSchema,
  ItemMediaAttachSchema,
  ItemMediaReorderSchema,
  ItemPreferencesUpdateSchema,
  ItemStockAdjustmentSchema,
  ItemUpdateSchema,
  ItemVariantGenerateSchema,
  ItemVariantUpdateSchema,
  PlanCloneSchema,
  PlanCreateSchema,
  PlanUpdateSchema,
  PriceListCreateSchema,
  PriceListResolveSchema,
  PriceListUpdateSchema,
  PriceCreateSchema,
  PriceUpdateSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  PlanEnsureSchema,
  PriceEnsureSchema,
  ProductEnsureSchema,
}
export const integrationItemCreateSchema = ItemCreateSchema.safeExtend({
  sourceExternalReference: z
    .string()
    .trim()
    .min(1)
    .max(191)
    .nullable()
    .optional(),
})
export const idParams = (name: string) =>
  z.strictObject({ [name]: z.string().min(1) })
export const organizationIdParams = z.strictObject({
  organizationId: z.string().min(1),
})
export const organizationResourceParams = (name: string) =>
  organizationIdParams.extend({ [name]: z.string().min(1) })
export const activeQuerySchema = z.strictObject({
  active: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})
export const planQuerySchema = activeQuerySchema.extend({
  productId: z.string().optional(),
})
export const priceQuerySchema = activeQuerySchema.extend({
  itemId: z.string().optional(),
  planId: z.string().optional(),
  addonId: z.string().optional(),
})
export const resourceSchema = (object: string) =>
  z.object({ object: z.literal(object), id: z.string() }).passthrough()
export const deletedSchema = (object: string) =>
  z.strictObject({
    object: z.literal(object),
    id: z.string(),
    deleted: z.literal(true),
  })
export const listSchema = (object: string) =>
  z.strictObject({
    object: z.literal('list'),
    data: z.array(resourceSchema(object)),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
export const itemPreferencesSchema = z.strictObject({
  object: z.literal('item_preferences'),
  productVariants: z.boolean(),
})
export const associationBatchSchema = z.object({
  object: z.literal('addon_association_batch'),
  ids: z.array(z.string()),
})
export const resolutionSchema = z
  .object({
    object: z.literal('price_resolution'),
    currency: z.string(),
    amount: z.string(),
  })
  .passthrough()
export function active(value?: string) {
  return value === undefined ? undefined : value === 'true'
}
