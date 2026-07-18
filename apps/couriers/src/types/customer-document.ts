import * as z from 'zod'

// ── CustomerIdType ────────────────────────────────────────────────────────────

export const customerIdTypeViewSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  hasExpiry: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CustomerIdTypeView = z.infer<typeof customerIdTypeViewSchema>

export const customerIdTypeCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  slug: z.string().min(1),
  hasExpiry: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type CustomerIdTypeCreateParams = z.input<
  typeof customerIdTypeCreateParamsSchema
>

export const customerIdTypeUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  hasExpiry: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type CustomerIdTypeUpdateParams = z.input<
  typeof customerIdTypeUpdateParamsSchema
>

export const customerIdTypeRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CustomerIdTypeRetrieveParams = z.input<
  typeof customerIdTypeRetrieveParamsSchema
>

export const customerIdTypeListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})
export type CustomerIdTypeListParams = z.input<
  typeof customerIdTypeListParamsSchema
>

export const customerIdTypeSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type CustomerIdTypeSearchParams = z.input<
  typeof customerIdTypeSearchParamsSchema
>

export const deletedCustomerIdTypeSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCustomerIdType = z.infer<typeof deletedCustomerIdTypeSchema>

// ── CustomerDocument ──────────────────────────────────────────────────────────

export const customerDocumentViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  typeId: z.string(),
  number: z.string().nullable(),
  expiresAt: z.number().int().nullable(),
  fileUrl: z.string().nullable(),
  isVerified: z.boolean(),
  verifiedAt: z.number().int().nullable(),
  verifiedById: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CustomerDocumentView = z.infer<typeof customerDocumentViewSchema>

export const customerDocumentCreateParamsSchema = z.strictObject({
  customerId: z.string(),
  typeId: z.string(),
  number: z.string().optional(),
  expiresAt: z.number().int().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
})
export type CustomerDocumentCreateParams = z.input<
  typeof customerDocumentCreateParamsSchema
>

export const customerDocumentUpdateParamsSchema = z.strictObject({
  number: z.string().optional(),
  expiresAt: z.number().int().optional(),
  fileUrl: z.string().optional(),
  isVerified: z.boolean().optional(),
  verifiedAt: z.number().int().optional(),
  verifiedById: z.string().optional(),
  notes: z.string().optional(),
})
export type CustomerDocumentUpdateParams = z.input<
  typeof customerDocumentUpdateParamsSchema
>

export const customerDocumentRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CustomerDocumentRetrieveParams = z.input<
  typeof customerDocumentRetrieveParamsSchema
>

export const customerDocumentListParamsSchema = z.strictObject({
  customerId: z.string(),
  typeId: z.string().optional(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type CustomerDocumentListParams = z.input<
  typeof customerDocumentListParamsSchema
>

export const deletedCustomerDocumentSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCustomerDocument = z.infer<
  typeof deletedCustomerDocumentSchema
>
