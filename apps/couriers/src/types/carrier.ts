import * as z from 'zod'

export const carrierViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  trackingUrlTemplate: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CarrierView = z.infer<typeof carrierViewSchema>

export const carrierCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  trackingUrlTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type CarrierCreateParams = z.input<typeof carrierCreateParamsSchema>

export const carrierUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  trackingUrlTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type CarrierUpdateParams = z.input<typeof carrierUpdateParamsSchema>

export const carrierRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CarrierRetrieveParams = z.input<typeof carrierRetrieveParamsSchema>

export const carrierListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type CarrierListParams = z.input<typeof carrierListParamsSchema>

export const carrierSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type CarrierSearchParams = z.input<typeof carrierSearchParamsSchema>

export const deletedCarrierSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCarrier = z.infer<typeof deletedCarrierSchema>
