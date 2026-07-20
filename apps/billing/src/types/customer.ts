import { z } from 'zod'

import { IdSchema, optionalShortTextSchema } from './common'
import { currencyCodeSchema } from './currency'
import { TaxBehaviorSchema } from './invoice-preference'

export const CustomerTypeSchema = z.enum([
  'EXTERNAL',
  'CORE_USER',
  'CORE_ORGANIZATION',
])

export const CustomerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])

/** Salutation is a free-type field with common suggestions (Zoho-style). */
export const salutationSchema = z.string().trim().min(1).max(40)

export const CustomerCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160),
    customerKind: CustomerKindSchema.default('INDIVIDUAL'),
    salutation: salutationSchema.nullable().optional(),
    firstName: z.string().trim().min(1).max(80).nullable().optional(),
    lastName: z.string().trim().min(1).max(80).nullable().optional(),
    companyName: z.string().trim().min(1).max(160).nullable().optional(),
    email: z.email().nullable().optional(),
    phone: optionalShortTextSchema,
    workPhone: optionalShortTextSchema,
    currency: currencyCodeSchema.nullable().optional(),
    language: z.string().trim().min(2).max(12).nullable().optional(),
    customerType: CustomerTypeSchema.default('EXTERNAL'),
    organizationId: IdSchema.nullable().optional(),
    userId: IdSchema.nullable().optional(),
    externalReference: IdSchema.nullable().optional(),
    paymentTermId: IdSchema.nullable().optional(),
    salespersonId: IdSchema.nullable().optional(),
    priceListId: IdSchema.nullable().optional(),
    taxBehaviorOverride: TaxBehaviorSchema.nullable().optional(),
    lateFeeExempt: z.boolean().default(false),
    invoiceNotes: z.string().trim().min(1).max(5000).nullable().optional(),
    invoiceTerms: z.string().trim().min(1).max(5000).nullable().optional(),
  })
  .superRefine((value, context) => {
    const organizationId = value.organizationId ?? null
    const userId = value.userId ?? null

    if (value.customerType === 'EXTERNAL' && (organizationId || userId)) {
      context.addIssue({
        code: 'custom',
        message:
          'External customers cannot include a core user or organization ID.',
        path: ['customerType'],
      })
    }

    if (value.customerType === 'CORE_USER' && (!userId || organizationId)) {
      context.addIssue({
        code: 'custom',
        message: 'A core-user customer requires only a user ID.',
        path: ['userId'],
      })
    }

    if (
      value.customerType === 'CORE_ORGANIZATION' &&
      (!organizationId || userId)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A core-organization customer requires only an organization ID.',
        path: ['organizationId'],
      })
    }
  })

export type CustomerCreateParams = z.infer<typeof CustomerCreateSchema>
export type CustomerCreateInput = z.input<typeof CustomerCreateSchema>

export interface CustomerCreated {
  object: 'customer'
  id: string
}

export const CustomerStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

export const CustomerUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  customerKind: CustomerKindSchema.optional(),
  salutation: salutationSchema.nullable().optional(),
  firstName: z.string().trim().min(1).max(80).nullable().optional(),
  lastName: z.string().trim().min(1).max(80).nullable().optional(),
  companyName: z.string().trim().min(1).max(160).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: optionalShortTextSchema,
  workPhone: optionalShortTextSchema,
  currency: currencyCodeSchema.nullable().optional(),
  language: z.string().trim().min(2).max(12).nullable().optional(),
  status: CustomerStatusSchema.optional(),
  paymentTermId: IdSchema.nullable().optional(),
  salespersonId: IdSchema.nullable().optional(),
  priceListId: IdSchema.nullable().optional(),
  taxBehaviorOverride: TaxBehaviorSchema.nullable().optional(),
  lateFeeExempt: z.boolean().optional(),
  invoiceNotes: z.string().trim().min(1).max(5000).nullable().optional(),
  invoiceTerms: z.string().trim().min(1).max(5000).nullable().optional(),
})

export type CustomerUpdateParams = z.infer<typeof CustomerUpdateSchema>
export type CustomerUpdateInput = z.input<typeof CustomerUpdateSchema>

export interface CustomerUpdated {
  object: 'customer'
  id: string
}

export const CustomerLinkSchema = z.strictObject({
  userId: IdSchema,
})

export type CustomerLinkParams = z.infer<typeof CustomerLinkSchema>
export type CustomerLinkInput = z.input<typeof CustomerLinkSchema>

export interface CustomerDeleted {
  object: 'customer'
  id: string
  deleted: true
}

export const CustomerOpeningBalanceSchema = z.strictObject({
  amount: z.coerce.bigint().refine((value) => value > 0n),
  currency: currencyCodeSchema,
  asOf: z.number().int().min(0),
  reference: optionalShortTextSchema,
})

export type CustomerOpeningBalanceParams = z.infer<
  typeof CustomerOpeningBalanceSchema
>

export type CustomerResource = {
  object: 'customer'
  id: string
} & Record<string, unknown>

/** Serialized row consumed by the Billing customer table. */
export interface CustomerTableRow {
  id: string
  name: string
  companyName: string | null
  phone: string | null
  /** Lifetime revenue received from this customer, in the currency's minor units. */
  receivables: number
  currency: string
  status: 'ACTIVE' | 'ARCHIVED'
}

export interface DocumentCustomerOption {
  value: string
  label: string
  priceListId: string | null
  organizationName: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  address: {
    label: string | null
    attention: string | null
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    countryCode: string | null
  } | null
}
