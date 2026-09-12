import { z } from 'zod'

import type {
  Invoice,
  InvoiceList,
  Quote,
  QuoteList,
  InvoiceCreated,
  DeletedInvoice,
  DeletedQuote,
  InvoicePreference,
  InvoicePreferenceUpdated,
  LateFeeRun,
  InvoiceDetail,
} from './invoice'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

/**
 * The schema for a created invoice response.
 */
export const InvoiceCreatedSchema = createdResourceSchema(
  'invoice'
) satisfies z.ZodType<InvoiceCreated>

/**
 * The schema for tenant invoice preferences.
 */
export const InvoicePreferenceSchema = z.strictObject({
  object: z.literal('invoice_preference'),
  tenantId: z.string().min(1),
  defaultTaxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  defaultNotes: z.string().nullable(),
  defaultTerms: z.string().nullable(),
  allowEditingSentInvoices: z.boolean(),
  lateFeesEnabled: z.boolean(),
  lateFeeCalculationType: z.enum(['PERCENTAGE', 'FIXED']),
  lateFeePercent: z.string().nullable(),
  lateFeeAmount: z.string().nullable(),
  lateFeeGraceDays: z.number().int(),
  lateFeeGenerateAsDraft: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<InvoicePreference>

/**
 * The schema for an invoice-preference update confirmation.
 */
export const InvoicePreferenceUpdatedSchema = z.strictObject({
  object: z.literal('invoice_preference'),
  tenantId: z.string().min(1),
}) satisfies z.ZodType<InvoicePreferenceUpdated>

/**
 * The schema for a late-fee generation run summary.
 */
export const LateFeeRunSchema = z.strictObject({
  object: z.literal('late_fee_run'),
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  hasMore: z.boolean(),
}) satisfies z.ZodType<LateFeeRun>
export const InvoiceSchema = z
  .strictObject({
    object: z.literal('invoice'),
    id: z.string().min(1),
    recurringInvoiceId: z.string().min(1).nullable().optional(),
  })
  .passthrough() satisfies z.ZodType<Invoice>

/** The schema for a deleted invoice tombstone. */
export const DeletedInvoiceSchema = deletedResourceSchema(
  'invoice'
) satisfies z.ZodType<DeletedInvoice>

export const InvoiceListSchema = listSchema(
  InvoiceSchema
) satisfies z.ZodType<InvoiceList>

/** The schema for one tenant quote. */
export const QuoteSchema = z
  .strictObject({ object: z.literal('quote'), id: z.string().min(1) })
  .passthrough() satisfies z.ZodType<Quote>

/** The schema for a paginated list of quotes. */
export const QuoteListSchema = listSchema(
  QuoteSchema
) satisfies z.ZodType<QuoteList>

/** The schema for a deleted quote tombstone. */
export const DeletedQuoteSchema = deletedResourceSchema(
  'quote'
) satisfies z.ZodType<DeletedQuote>

/** Full retrieve response; monetary values remain integer minor-unit strings. */
export const InvoiceDetailSchema = InvoiceSchema.extend({
  number: z.string(),
  status: z.enum([
    'DRAFT',
    'OPEN',
    'SENT',
    'PARTIALLY_PAID',
    'OVERDUE',
    'PAID',
    'UNCOLLECTIBLE',
    'VOID',
  ]),
  customerId: z.string(),
  currency: z.string(),
  billingReason: z.string(),
  subscriptionId: z.string().nullable(),
  priceListId: z.string().nullable(),
  salespersonId: z.string().nullable(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  billingAddressSnapshot: z.unknown(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  subject: z.string().nullable(),
  orderNumber: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  paymentTermName: z.string().nullable(),
  salespersonName: z.string().nullable(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  issueAt: z.number().nullable(),
  dueAt: z.number().nullable(),
  servicePeriodStart: z.number().nullable(),
  servicePeriodEnd: z.number().nullable(),
  subtotalAmount: z.string().regex(/^-?\d+$/),
  taxAmount: z.string().regex(/^-?\d+$/),
  discountAmount: z.string().regex(/^-?\d+$/),
  shippingAmount: z.string().regex(/^-?\d+$/),
  adjustmentAmount: z.string().regex(/^-?\d+$/),
  totalAmount: z.string().regex(/^-?\d+$/),
  amountDue: z.string().regex(/^-?\d+$/),
  amountPaid: z.string().regex(/^-?\d+$/),
  amountCredited: z.string().regex(/^-?\d+$/),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    addresses: z.array(
      z.object({
        attention: z.string().nullable(),
        line1: z.string().nullable(),
        line2: z.string().nullable(),
        city: z.string().nullable(),
        state: z.string().nullable(),
        postalCode: z.string().nullable(),
        countryCode: z.string().nullable(),
      })
    ),
  }),
  lines: z.array(
    z.object({
      id: z.string(),
      itemId: z.string().nullable(),
      variantId: z.string().nullable(),
      priceId: z.string().nullable(),
      description: z.string(),
      quantity: z.number().int(),
      position: z.number().int(),
      unitAmount: z.string().regex(/^\d+$/),
      taxAmount: z.string().regex(/^\d+$/),
      discountAmount: z.string().regex(/^\d+$/),
      totalAmount: z.string().regex(/^\d+$/),
      servicePeriodStart: z.number().nullable(),
      servicePeriodEnd: z.number().nullable(),
    })
  ),
  lateFeeAssessment: z
    .object({ sourceInvoice: z.object({ id: z.string(), number: z.string() }) })
    .nullable(),
}) satisfies z.ZodType<InvoiceDetail>
