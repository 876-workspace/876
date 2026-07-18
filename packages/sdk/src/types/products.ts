import * as z from 'zod'
import type { Result } from './api.ts'

export const sdk876PriceSchema = z.object({
  object: z.literal('price'),
  id: z.string(),
  product_id: z.string(),

  billing_interval: z.string().nullable(),
  interval_count: z.number().nullable(),
  status: z.string(),

  unit_amount: z.number().nullable(),
  unit_amount_decimal: z.string().nullable(),
  currency: z.string(),

  lookup_key: z.string().nullable(),
  name: z.string().nullable(),
  nickname: z.string().nullable(),
  type: z.string(),
  billing_scheme: z.string(),
  tiers_mode: z.string().nullable(),
  tiers: z.array(z.record(z.string(), z.unknown())).nullable(),
  recurring: z.record(z.string(), z.unknown()).nullable(),
  tax_behavior: z.string().nullable(),
  transform_quantity: z.record(z.string(), z.unknown()).nullable(),
  trial_period_days: z.number().nullable(),
  active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),

  created_at: z.number(),
  updated_at: z.number(),
  archived_at: z.number().nullable(),
})

export const sdk876ProductSchema = z.object({
  object: z.literal('product'),
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  app_id: z.string().nullable(),
  app_slug: z.string().nullable(),
  app_name: z.string().nullable(),
  app_logo_url: z.string().nullable(),
  app_kind: z.string().nullable(),

  status: z.string(),
  active: z.boolean(),
  statement_descriptor: z.string().nullable(),
  unit_label: z.string().nullable(),
  tax_code_id: z.string().nullable(),
  lookup_key: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),

  prices: z.array(sdk876PriceSchema),

  created_at: z.number(),
  updated_at: z.number(),
  archived_at: z.number().nullable(),
})

export const sdk876ProductListSchema = z.object({
  object: z.literal('list'),
  data: z.array(sdk876ProductSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

export type Price = z.infer<typeof sdk876PriceSchema>
export type Product = z.infer<typeof sdk876ProductSchema>
export type ProductList = z.infer<typeof sdk876ProductListSchema>

export type ProductResult = Result<Product>
export type ProductListResult = Result<ProductList>
