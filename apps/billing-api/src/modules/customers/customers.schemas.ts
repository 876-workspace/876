import { z } from 'zod'

const nullableText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional()
const currency = z
  .string()
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase())

export const customerParamsSchema = z.strictObject({
  customerId: z.string().min(1),
})
export const contactParamsSchema = customerParamsSchema.extend({
  contactId: z.string().min(1),
})
export const organizationCustomerParamsSchema = customerParamsSchema.extend({
  organizationId: z.string().min(1),
})
export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().min(1),
})

export const integrationCustomerCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  customerType: z
    .enum(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION'])
    .default('EXTERNAL'),
  organizationId: nullableText(191),
  userId: nullableText(191),
  externalReference: nullableText(191),
  sourceExternalReference: nullableText(191),
  salutation: nullableText(40),
  firstName: nullableText(80),
  lastName: nullableText(80),
  companyName: nullableText(160),
  email: z.string().email().nullable().optional(),
  phone: nullableText(160),
  workPhone: nullableText(160),
  currency: currency.nullable().optional(),
  language: z.string().trim().min(2).max(12).nullable().optional(),
  paymentTermId: nullableText(191),
  salespersonId: nullableText(191),
  priceListId: nullableText(191),
  taxBehaviorOverride: z.enum(['EXCLUSIVE', 'INCLUSIVE']).nullable().optional(),
  lateFeeExempt: z.boolean().default(false),
  invoiceNotes: nullableText(5000),
  invoiceTerms: nullableText(5000),
})

export const customerCreateBodySchema =
  integrationCustomerCreateBodySchema.omit({ sourceExternalReference: true })

export const customerUpdateBodySchema = customerCreateBodySchema
  .omit({
    customerType: true,
    organizationId: true,
    userId: true,
    externalReference: true,
  })
  .partial()
  .extend({ status: z.enum(['ACTIVE', 'ARCHIVED']).optional() })
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field.')

export const customerListQuerySchema = z.strictObject({
  q: z.string().trim().max(160).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  userId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  ids: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : (Array.isArray(value) ? value : value.split(',')).filter(Boolean)
    ),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})
export const integrationCustomerListQuerySchema = z.strictObject({
  q: z.string().trim().max(160).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  user_id: z.string().min(1).optional(),
  organization_id: z.string().min(1).optional(),
  ids: z.union([z.string(), z.array(z.string())]).optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})

export const customerEnsureBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  customerType: z
    .enum(['CORE_ORGANIZATION', 'CORE_USER'])
    .default('CORE_ORGANIZATION'),
  organizationId: z.string().min(1).max(191).optional(),
  userId: z.string().min(1).max(191).optional(),
  tenantId: z.string().min(1).optional(),
  tenantSlug: z.string().min(1).optional(),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  email: z.string().email().nullable().optional(),
  companyName: nullableText(160),
  firstName: nullableText(80),
  lastName: nullableText(80),
  phone: nullableText(160),
  primaryContact: z
    .strictObject({
      userId: nullableText(191),
      salutation: nullableText(40),
      firstName: nullableText(80),
      lastName: nullableText(80),
      email: z.string().email().nullable().optional(),
      phone: nullableText(160),
      workPhone: nullableText(160),
      mobilePhone: nullableText(160),
      avatar: nullableText(2048),
    })
    .nullable()
    .optional(),
})

export const openingBalanceBodySchema = z.strictObject({
  amount: z.coerce.bigint().positive(),
  currency,
  asOf: z.coerce.number().int().positive(),
  reference: z.string().trim().min(1).max(191).optional(),
})

export const linkCustomerBodySchema = z
  .strictObject({
    customerType: z.enum(['CORE_USER', 'CORE_ORGANIZATION']),
    organizationId: nullableText(191),
    userId: nullableText(191),
  })
  .superRefine((body, context) => {
    if (body.customerType === 'CORE_USER' && !body.userId) {
      context.addIssue({ code: 'custom', message: 'userId is required.' })
    }
    if (body.customerType === 'CORE_ORGANIZATION' && !body.organizationId) {
      context.addIssue({
        code: 'custom',
        message: 'organizationId is required.',
      })
    }
  })

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}
const importText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().min(1).max(max).optional())
const customerImportRowSchema = z.strictObject({
  name: z.preprocess(emptyToUndefined, z.string().min(1).max(160)),
  customerKind: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const token = value.trim().toUpperCase()
      if (token === '' || token === 'PERSON') return 'INDIVIDUAL'
      if (token === 'COMPANY' || token === 'ORGANIZATION') return 'BUSINESS'
      return token
    },
    z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL')
  ),
  salutation: importText(40),
  firstName: importText(80),
  lastName: importText(80),
  companyName: importText(160),
  email: z.preprocess(emptyToUndefined, z.string().email().max(320).optional()),
  phone: importText(160),
  workPhone: importText(160),
  currency: z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value.trim().toUpperCase() || undefined
        : value,
    z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional()
  ),
  language: importText(12),
  externalReference: importText(160),
})
export const customerImportBodySchema = z.strictObject({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(2000),
})

export type CustomerCreateBody = z.infer<typeof customerCreateBodySchema>
export type CustomerUpdateBody = z.infer<typeof customerUpdateBodySchema>
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>
export type IntegrationCustomerListQuery = z.infer<
  typeof integrationCustomerListQuerySchema
>
export type CustomerEnsureBody = z.infer<typeof customerEnsureBodySchema>
export type OpeningBalanceBody = z.infer<typeof openingBalanceBodySchema>
export type LinkCustomerBody = z.infer<typeof linkCustomerBodySchema>
export type CustomerImportBody = z.infer<typeof customerImportBodySchema>
export type CustomerImportRow = z.infer<typeof customerImportRowSchema>
export { customerImportRowSchema }

export const contactSchema = z.strictObject({
  object: z.literal('contact'),
  id: z.string(),
  userId: z.string().nullable(),
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  workPhone: z.string().nullable(),
  mobilePhone: z.string().nullable(),
  avatar: z.string().nullable(),
  isPrimary: z.boolean(),
  coreSyncedAt: z.number().int().nullable(),
})
export const contactListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(contactSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export const deletedContactSchema = z.strictObject({
  object: z.literal('contact'),
  id: z.string(),
  deleted: z.literal(true),
})
const contactBodyFields = {
  salutation: nullableText(40),
  firstName: nullableText(80),
  lastName: nullableText(80),
  email: z.string().email().max(320).nullable().optional(),
  workPhone: nullableText(160),
  mobilePhone: nullableText(160),
  isPrimary: z.boolean().optional(),
}
export const contactCreateBodySchema = z
  .strictObject(contactBodyFields)
  .refine(
    (body) => Boolean(body.firstName || body.lastName || body.email),
    'Provide at least one of firstName, lastName, or email.'
  )
export const contactUpdateBodySchema = z
  .strictObject(contactBodyFields)
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field.')
export type ContactCreateBody = z.infer<typeof contactCreateBodySchema>
export type ContactUpdateBody = z.infer<typeof contactUpdateBodySchema>
export const customerSchema = z.object({
  object: z.literal('customer'),
  id: z.string(),
  sourceAppId: z.string().nullable(),
  sourceExternalReference: z.string().nullable(),
  customerType: z.enum(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION']),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  externalReference: z.string().nullable(),
  name: z.string(),
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  companyName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  workPhone: z.string().nullable(),
  billingAddress: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  defaultCurrency: z.string().nullable(),
  language: z.string().nullable(),
  outstandingReceivable: z.string(),
  unusedCredits: z.string(),
  coreSyncedAt: z.number().int().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  primaryContact: contactSchema.nullable(),
  // Present on retrieve only. A list would pay three aggregates per row for
  // something no list column renders.
  counts: z
    .object({
      subscriptions: z.number().int(),
      invoices: z.number().int(),
      quotes: z.number().int(),
    })
    .optional(),
})
export const deletedCustomerSchema = z.strictObject({
  object: z.literal('customer'),
  id: z.string(),
  deleted: z.literal(true),
})
export const customerListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(customerSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
const customerLedgerEntrySchema = z.object({
  object: z.literal('customer_ledger_entry'),
  id: z.string(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  invoiceId: z.string().nullable(),
  paymentId: z.string().nullable(),
  creditNoteId: z.string().nullable(),
  refundId: z.string().nullable(),
  type: z.string(),
  direction: z.enum(['DEBIT', 'CREDIT']),
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  effectiveAt: z.number().int(),
  createdAt: z.number().int(),
})
export const customerAccountSchema = z.object({
  object: z.literal('customer_account'),
  customer: customerSchema,
  currency: z.string().nullable(),
  lifetimeBilled: z.string(),
  lifetimePaid: z.string(),
  lifetimeSales: z.string(),
  lifetimeCredits: z.string(),
  lastSaleAt: z.number().int().nullable(),
  activeSubscriptionCount: z.number().int(),
  subscriptionMrr: z.array(
    z.strictObject({
      currency: z.string(),
      mrr: z.string(),
      arr: z.string(),
    })
  ),
  outstandingReceivable: z.string(),
  overdueReceivable: z.string(),
  availableCredit: z.string(),
  netPosition: z.string(),
  openingBalance: z.string(),
  closingBalance: z.string(),
  statement: z.array(customerLedgerEntrySchema.extend({ balance: z.string() })),
  unusedCredits: z.string(),
  entries: z.array(customerLedgerEntrySchema),
})
export const createdInvoiceSchema = z.strictObject({
  object: z.literal('invoice'),
  id: z.string(),
})
export const customerImportSchema = z.object({
  object: z.literal('customer_import'),
  total: z.number().int(),
  imported: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int(),
  rows: z.array(
    z.strictObject({
      index: z.number().int(),
      name: z.string(),
      status: z.enum(['imported', 'skipped', 'failed']),
      reason: z.string().optional(),
    })
  ),
})
