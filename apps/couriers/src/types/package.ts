import * as z from 'zod'

// ── PackageDocument ───────────────────────────────────────────────────────────

export const packageDocumentTypeSchema = z.enum(['RECEIPT', 'INVOICE', 'OTHER'])
export type PackageDocumentType = z.infer<typeof packageDocumentTypeSchema>

export const packageDocumentViewSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  type: packageDocumentTypeSchema,
  name: z.string(),
  url: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type PackageDocumentView = z.infer<typeof packageDocumentViewSchema>

export const packageDocumentCreateParamsSchema = z.strictObject({
  packageId: z.string(),
  type: packageDocumentTypeSchema,
  name: z.string().min(1),
  url: z.string().min(1),
})
export type PackageDocumentCreateParams = z.input<
  typeof packageDocumentCreateParamsSchema
>

export const packageDocumentRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type PackageDocumentRetrieveParams = z.input<
  typeof packageDocumentRetrieveParamsSchema
>

export const packageDocumentListParamsSchema = z.strictObject({
  packageId: z.string(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type PackageDocumentListParams = z.input<
  typeof packageDocumentListParamsSchema
>

export const deletedPackageDocumentSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedPackageDocument = z.infer<
  typeof deletedPackageDocumentSchema
>

// ── PackageNote ───────────────────────────────────────────────────────────────

export const packageNoteViewSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type PackageNoteView = z.infer<typeof packageNoteViewSchema>

export const packageNoteCreateParamsSchema = z.strictObject({
  packageId: z.string(),
  authorId: z.string(),
  body: z.string().min(1),
})
export type PackageNoteCreateParams = z.input<
  typeof packageNoteCreateParamsSchema
>

export const packageNoteUpdateParamsSchema = z.strictObject({
  body: z.string().min(1),
})
export type PackageNoteUpdateParams = z.input<
  typeof packageNoteUpdateParamsSchema
>

export const packageNoteRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type PackageNoteRetrieveParams = z.input<
  typeof packageNoteRetrieveParamsSchema
>

export const packageNoteListParamsSchema = z.strictObject({
  packageId: z.string(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type PackageNoteListParams = z.input<typeof packageNoteListParamsSchema>

export const deletedPackageNoteSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedPackageNote = z.infer<typeof deletedPackageNoteSchema>

// ── Package ───────────────────────────────────────────────────────────────────

export const packageStatusSchema = z.enum([
  'PRE_ALERT',
  'RECEIVED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'COLLECTED',
  'UNCLAIMED',
])
export type PackageStatus = z.infer<typeof packageStatusSchema>

export const packageTypeSchema = z.enum([
  'CARTON',
  'ENVELOPE',
  'BAG',
  'PALLET',
  'OTHER',
])
export type PackageType = z.infer<typeof packageTypeSchema>

export const packageViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  branchId: z.string().nullable(),
  mailboxId: z.string().nullable(),
  carrierId: z.string().nullable(),
  sellerId: z.string().nullable(),
  categoryId: z.string().nullable(),
  billingInvoiceId: z.string().nullable(),
  manifestId: z.string().nullable(),
  trackingNum: z.string().nullable(),
  status: packageStatusSchema,
  packageType: packageTypeSchema,
  description: z.string().nullable(),
  quantity: z.number().int(),
  actualWeight: z.number().nullable(),
  chargeableWeight: z.number().nullable(),
  length: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  dimensionalWeight: z.number().nullable(),
  declaredValue: z.number().int().nullable(),
  hsCode: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  hasCustomsDuty: z.boolean(),
  importDutyAmount: z.number().int().nullable(),
  gctAmount: z.number().int().nullable(),
  customsEntryNumber: z.string().nullable(),
  customsClearedAt: z.number().int().nullable(),
  customsHoldReason: z.string().nullable(),
  isHazardous: z.boolean(),
  condition: z.string().nullable(),
  collectedAt: z.number().int().nullable(),
  collectedById: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type PackageView = z.infer<typeof packageViewSchema>

export interface PortalPackage extends PackageView {
  carrier: { name: string } | null
  branch: { name: string } | null
  mailbox: { number: string } | null
}

export interface CustomerPackageListParams {
  tenantId: string
  customerId: string
}

export interface TenantPackageRetrieveParams {
  tenantId: string
  id: string
}

export const packageCreateParamsSchema = z.strictObject({
  customerId: z.string(),
  branchId: z.string().optional(),
  mailboxId: z.string().optional(),
  carrierId: z.string().optional(),
  sellerId: z.string().optional(),
  categoryId: z.string().optional(),
  billingInvoiceId: z.string().optional(),
  manifestId: z.string().optional(),
  trackingNum: z.string().optional(),
  status: packageStatusSchema.optional(),
  packageType: packageTypeSchema.optional(),
  description: z.string().optional(),
  quantity: z.number().int().optional(),
  actualWeight: z.number().optional(),
  chargeableWeight: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  dimensionalWeight: z.number().optional(),
  declaredValue: z.number().int().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  hasCustomsDuty: z.boolean().optional(),
  importDutyAmount: z.number().int().optional(),
  gctAmount: z.number().int().optional(),
  customsEntryNumber: z.string().optional(),
  isHazardous: z.boolean().optional(),
  condition: z.string().optional(),
})
export type PackageCreateParams = z.input<typeof packageCreateParamsSchema>

export const packageUpdateParamsSchema = z.strictObject({
  branchId: z.string().optional(),
  mailboxId: z.string().optional(),
  carrierId: z.string().optional(),
  sellerId: z.string().optional(),
  categoryId: z.string().optional(),
  billingInvoiceId: z.string().optional(),
  manifestId: z.string().optional(),
  trackingNum: z.string().optional(),
  status: packageStatusSchema.optional(),
  packageType: packageTypeSchema.optional(),
  description: z.string().optional(),
  quantity: z.number().int().optional(),
  actualWeight: z.number().optional(),
  chargeableWeight: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  dimensionalWeight: z.number().optional(),
  declaredValue: z.number().int().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  hasCustomsDuty: z.boolean().optional(),
  importDutyAmount: z.number().int().optional(),
  gctAmount: z.number().int().optional(),
  customsEntryNumber: z.string().optional(),
  customsClearedAt: z.number().int().optional(),
  customsHoldReason: z.string().optional(),
  isHazardous: z.boolean().optional(),
  condition: z.string().optional(),
  collectedAt: z.number().int().optional(),
  collectedById: z.string().optional(),
})
export type PackageUpdateParams = z.input<typeof packageUpdateParamsSchema>

export const packageRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type PackageRetrieveParams = z.input<typeof packageRetrieveParamsSchema>

export const packageListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  status: packageStatusSchema.optional(),
  packageType: packageTypeSchema.optional(),
  customerId: z.string().optional(),
  branchId: z.string().optional(),
  carrierId: z.string().optional(),
  manifestId: z.string().optional(),
})
export type PackageListParams = z.input<typeof packageListParamsSchema>

export const packageSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type PackageSearchParams = z.input<typeof packageSearchParamsSchema>

export const deletedPackageSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedPackage = z.infer<typeof deletedPackageSchema>
