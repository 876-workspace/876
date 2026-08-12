import * as z from 'zod'

// ── CustomerAddress ───────────────────────────────────────────────────────────

export const customerAddressViewSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  label: z.string().nullable(),
  street1: z.string(),
  street2: z.string().nullable(),
  city: z.string(),
  parish: z.string().nullable(),
  country: z.string(),
  postalCode: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CustomerAddressView = z.infer<typeof customerAddressViewSchema>

export const customerAddressCreateParamsSchema = z.strictObject({
  customerId: z.string(),
  label: z.string().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  parish: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
})
export type CustomerAddressCreateParams = z.input<
  typeof customerAddressCreateParamsSchema
>

export const customerAddressUpdateParamsSchema = z.strictObject({
  label: z.string().optional(),
  street1: z.string().min(1).optional(),
  street2: z.string().optional(),
  city: z.string().min(1).optional(),
  parish: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
})
export type CustomerAddressUpdateParams = z.input<
  typeof customerAddressUpdateParamsSchema
>

export const customerAddressRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CustomerAddressRetrieveParams = z.input<
  typeof customerAddressRetrieveParamsSchema
>

export const customerAddressListParamsSchema = z.strictObject({
  customerId: z.string(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type CustomerAddressListParams = z.input<
  typeof customerAddressListParamsSchema
>

export const deletedCustomerAddressSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCustomerAddress = z.infer<
  typeof deletedCustomerAddressSchema
>

// ── Contact ───────────────────────────────────────────────────────────────────

export const contactViewSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  userId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type ContactView = z.infer<typeof contactViewSchema>

export const contactCreateParamsSchema = z.strictObject({
  customerId: z.string(),
  name: z.string().min(1),
  phone: z.string().optional(),
  userId: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type ContactCreateParams = z.input<typeof contactCreateParamsSchema>

export const contactUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  userId: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type ContactUpdateParams = z.input<typeof contactUpdateParamsSchema>

export const contactRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type ContactRetrieveParams = z.input<typeof contactRetrieveParamsSchema>

export const contactListParamsSchema = z.strictObject({
  customerId: z.string(),
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type ContactListParams = z.input<typeof contactListParamsSchema>

export const deletedContactSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedContact = z.infer<typeof deletedContactSchema>

// ── Customer ──────────────────────────────────────────────────────────────────

export const customerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])
export type CustomerStatus = z.infer<typeof customerStatusSchema>

export const customerViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().nullable(),
  billingCustomerId: z.string(),
  branchId: z.string().nullable(),
  status: customerStatusSchema,
  trn: z.string().nullable(),
  isCommercial: z.boolean(),
  firstSeenAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CustomerView = z.infer<typeof customerViewSchema>

export const customerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])
export type CustomerKind = z.infer<typeof customerKindSchema>

export const customerCreateParamsSchema = z
  .strictObject({
    /**
     * Client-generated, stable across retries of one submission. It keys the
     * Billing registry create so a retry after a failed local write reuses the
     * customer already created instead of minting a duplicate.
     */
    idempotencyKey: z.string().min(8).max(255),
    customerKind: customerKindSchema.default('INDIVIDUAL'),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    companyName: z.string().trim().min(1).optional(),
    // Nullable as well as optional so one form can build both payloads: on
    // create there is no previous value to clear, and null simply means absent.
    email: z.email().nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    branchId: z.string().optional(),
    trn: z.string().trim().min(1).nullable().optional(),
    isCommercial: z.boolean().optional(),
    status: customerStatusSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.customerKind === 'INDIVIDUAL' && !value.firstName)
      context.addIssue({
        code: 'custom',
        path: ['firstName'],
        message: 'First name is required for an individual.',
      })
    if (value.customerKind === 'BUSINESS' && !value.companyName)
      context.addIssue({
        code: 'custom',
        path: ['companyName'],
        message: 'Company name is required for a business.',
      })
  })
export type CustomerCreateParams = z.input<typeof customerCreateParamsSchema>

export const customerEnrollmentParamsSchema = z.strictObject({
  billingCustomerId: z.string().min(1),
  branchId: z.string().min(1),
  isCommercial: z.boolean().optional(),
  status: customerStatusSchema.optional(),
})
export type CustomerEnrollmentParams = z.input<
  typeof customerEnrollmentParamsSchema
>

export interface GlobalCustomerOption {
  id: string
  name: string
  email: string | null
  phone: string | null
}

/**
 * `null` clears a value, an absent key leaves it alone. The party's name — a
 * first name for an individual, a company name for a business — is not
 * clearable, so those stay non-nullable.
 */
export const customerUpdateParamsSchema = z.strictObject({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).nullable().optional(),
  companyName: z.string().trim().min(1).optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  branchId: z.string().optional(),
  status: customerStatusSchema.optional(),
  trn: z.string().nullable().optional(),
  isCommercial: z.boolean().optional(),
})
export type CustomerUpdateParams = z.input<typeof customerUpdateParamsSchema>

export const customerRowSchema = customerViewSchema.extend({
  customerKind: customerKindSchema,
  customerType: z.enum(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION']),
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  companyName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  mailboxNumber: z.string().nullable(),
  branchName: z.string().nullable(),
})
export type CustomerRow = z.infer<typeof customerRowSchema>

export const customerRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CustomerRetrieveParams = z.input<
  typeof customerRetrieveParamsSchema
>

export const customerListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  status: customerStatusSchema.optional(),
  branchId: z.string().optional(),
  isCommercial: z.boolean().optional(),
})
export type CustomerListParams = z.input<typeof customerListParamsSchema>

export const customerSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type CustomerSearchParams = z.input<typeof customerSearchParamsSchema>

export const deletedCustomerSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedCustomer = z.infer<typeof deletedCustomerSchema>
