import * as z from 'zod'

export const sellerViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type SellerView = z.infer<typeof sellerViewSchema>

export const sellerCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type SellerCreateParams = z.input<typeof sellerCreateParamsSchema>

export const sellerUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type SellerUpdateParams = z.input<typeof sellerUpdateParamsSchema>

export const sellerRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type SellerRetrieveParams = z.input<typeof sellerRetrieveParamsSchema>

export const sellerListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type SellerListParams = z.input<typeof sellerListParamsSchema>

export const sellerSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type SellerSearchParams = z.input<typeof sellerSearchParamsSchema>

export const deletedSellerSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedSeller = z.infer<typeof deletedSellerSchema>
