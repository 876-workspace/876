import * as z from 'zod'
import { Price, priceSchema } from './prices'

const productIdSchema = z.string().trim().min(1)
const appIdSchema = z.string().trim().min(1)
const unixTimestampSchema = z.number().int().nonnegative()

export const productSchema: z.ZodType<Product> = z.strictObject({
  object: z.literal('product'),
  id: productIdSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  appId: appIdSchema,
  status: z.string(),
  active: z.boolean(),
  statementDescriptor: z.string().nullable(),
  unitLabel: z.string().nullable(),
  lookupKey: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  archivedAt: unixTimestampSchema.nullable(),
  prices: z.lazy(() => z.array(priceSchema)),
  createdAt: unixTimestampSchema,
  updatedAt: unixTimestampSchema,
})

export type Product = {
  object: 'product'
  id: string
  slug: string
  name: string
  description: string | null
  appId: string
  status: string
  active: boolean
  statementDescriptor: string | null
  unitLabel: string | null
  lookupKey: string | null
  metadata: Record<string, unknown> | null
  archivedAt: number | null
  prices: Price[]
  createdAt: number
}

export type ProductCreateParams = {
  appId: string
  name: string
  slug: string
  description?: string | null
  active?: boolean
  statementDescriptor?: string | null
  unitLabel?: string | null
  lookupKey?: string | null
  metadata?: Record<string, unknown> | null
}

export type ProductUpdateParams = Partial<Omit<ProductCreateParams, 'appId'>>

export type ProductListParams = {
  appId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const productCreateParamsSchema = z.strictObject({
  appId: appIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  statementDescriptor: z.string().nullable().optional(),
  unitLabel: z.string().nullable().optional(),
  lookupKey: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}) satisfies z.ZodType<ProductCreateParams>

export const productUpdateParamsSchema = productCreateParamsSchema
  .partial()
  .omit({ appId: true }) satisfies z.ZodType<ProductUpdateParams>

export const productListParamsSchema = z.strictObject({
  appId: appIdSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  startingAfter: productIdSchema.optional(),
  endingBefore: productIdSchema.optional(),
}) satisfies z.ZodType<ProductListParams>
