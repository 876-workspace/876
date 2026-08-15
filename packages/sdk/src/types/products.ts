import * as z from 'zod'
import type { Result } from './api.ts'

export const sdk876PriceSchema = z.object({
  object: z.literal('price'),
  id: z.string(),
  productId: z.string(),

  billingInterval: z.string().nullable(),
  intervalCount: z.number().nullable(),
  status: z.string(),

  unitAmount: z.number().nullable(),
  unitAmountDecimal: z.string().nullable(),
  currency: z.string(),

  lookupKey: z.string().nullable(),
  name: z.string().nullable(),
  nickname: z.string().nullable(),
  type: z.string(),
  billingScheme: z.string(),
  tiersMode: z.string().nullable(),
  tiers: z.array(z.record(z.string(), z.unknown())).nullable(),
  recurring: z.record(z.string(), z.unknown()).nullable(),
  taxBehavior: z.string().nullable(),
  transformQuantity: z.record(z.string(), z.unknown()).nullable(),
  trialPeriodDays: z.number().nullable(),
  active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),

  createdAt: z.number(),
  updatedAt: z.number(),
  archivedAt: z.number().nullable(),
})

export const sdk876ProductSchema = z.object({
  object: z.literal('product'),
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  appId: z.string().nullable(),
  appSlug: z.string().nullable(),
  appName: z.string().nullable(),
  appLogoUrl: z.string().nullable(),
  appKind: z.string().nullable(),

  status: z.string(),
  active: z.boolean(),
  statementDescriptor: z.string().nullable(),
  unitLabel: z.string().nullable(),
  taxCodeId: z.string().nullable(),
  lookupKey: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),

  prices: z.array(sdk876PriceSchema),

  createdAt: z.number(),
  updatedAt: z.number(),
  archivedAt: z.number().nullable(),
})

export const sdk876ProductListSchema = z.object({
  object: z.literal('list'),
  data: z.array(sdk876ProductSchema),
  hasMore: z.boolean(),
  url: z.string(),
  totalCount: z.number().int().nullable(),
})

export type Price = z.infer<typeof sdk876PriceSchema>
export type Product = z.infer<typeof sdk876ProductSchema>
export type ProductList = z.infer<typeof sdk876ProductListSchema>

export type ProductResult = Result<Product>
export type ProductListResult = Result<ProductList>
