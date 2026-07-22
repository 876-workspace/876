import { z } from 'zod'

import type { BillingItem, BillingItemList, DeletedBillingItem } from './item'
import { sourceSchema } from './customer.schema'

/**
 * The schema for a Billing item resource.
 */
export const BillingItemSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
  source: sourceSchema,
  type: z.enum(['GOOD', 'SERVICE']),
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
  isActive: z.boolean(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingItem>

/**
 * The schema for a paginated list of Billing items.
 */
export const BillingItemListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingItemSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingItemList>

/**
 * The schema for a deleted item tombstone.
 */
export const DeletedBillingItemSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingItem>
