import * as z from 'zod'

export const tenantStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED'])
export type TenantStatus = z.infer<typeof tenantStatusSchema>

export const tenantViewSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  slug: z.string(),
  name: z.string(),
  status: tenantStatusSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type TenantView = z.infer<typeof tenantViewSchema>

export const tenantRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type TenantRetrieveParams = z.input<typeof tenantRetrieveParamsSchema>

export const tenantListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  status: tenantStatusSchema.optional(),
})
export type TenantListParams = z.input<typeof tenantListParamsSchema>

export const tenantSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type TenantSearchParams = z.input<typeof tenantSearchParamsSchema>
