import { z } from 'zod'

import type {
  Estimate,
  EstimateList,
  Invoice,
  InvoiceCreated,
  InvoiceList,
  InvoicePreference,
  InvoicePreferenceUpdated,
  LateFeeRun,
  Quote,
  QuoteList,
} from './invoice'
import { createdResourceSchema, listSchema } from './common.schema'

/** The schema for a created invoice response. */
export const InvoiceCreatedSchema = createdResourceSchema(
  'invoice'
) satisfies z.ZodType<InvoiceCreated>

/** The schema for tenant invoice preferences. */
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

/** The schema for an invoice-preference update confirmation. */
export const InvoicePreferenceUpdatedSchema = z.strictObject({
  object: z.literal('invoice_preference'),
  tenantId: z.string().min(1),
}) satisfies z.ZodType<InvoicePreferenceUpdated>

/** The schema for a late-fee generation run summary. */
export const LateFeeRunSchema = z.strictObject({
  object: z.literal('late_fee_run'),
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  hasMore: z.boolean(),
}) satisfies z.ZodType<LateFeeRun>

const DocumentCustomerSchema = z.object({
  object: z.literal('customer'),
  id: z.string().min(1),
  name: z.string(),
})

const InvoiceLineSchema = z.object({
  object: z.literal('invoice_line'),
  id: z.string().min(1),
  itemId: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

const ProposalLineSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

/**
 * Stable public invoice DTO. `z.object` intentionally strips API fields that
 * are not part of the public tenant contract while continuing to validate the
 * fields applications are allowed to consume.
 */
export const InvoiceSchema = z.object({
  object: z.literal('invoice'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  quoteId: z.string().nullable(),
  estimateId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
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
  billingReason: z.enum([
    'MANUAL',
    'QUOTE',
    'ESTIMATE',
    'SUBSCRIPTION_CREATE',
    'SUBSCRIPTION_CYCLE',
    'SUBSCRIPTION_UPDATE',
    'OPENING_BALANCE',
    'LATE_FEE',
  ]),
  currency: z.string(),
  orderNumber: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  subject: z.string().nullable(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  issueAt: z.number().int().nullable(),
  dueAt: z.number().int().nullable(),
  sentAt: z.number().int().nullable(),
  paidAt: z.number().int().nullable(),
  voidedAt: z.number().int().nullable(),
  finalizedAt: z.number().int().nullable(),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  shippingAmount: z.string(),
  adjustmentAmount: z.string(),
  totalAmount: z.string(),
  amountDue: z.string(),
  amountPaid: z.string(),
  amountCredited: z.string(),
  amountWrittenOff: z.string(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: DocumentCustomerSchema,
  lines: z.array(InvoiceLineSchema),
}) satisfies z.ZodType<Invoice>

export const InvoiceListSchema = listSchema(
  InvoiceSchema
) satisfies z.ZodType<InvoiceList>

/** Stable public quote DTO. */
export const QuoteSchema = z.object({
  object: z.literal('quote'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  number: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED']),
  currency: z.string(),
  issueAt: z.number().int().nullable(),
  expiresAt: z.number().int().nullable(),
  acceptedAt: z.number().int().nullable(),
  declinedAt: z.number().int().nullable(),
  canceledAt: z.number().int().nullable(),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: DocumentCustomerSchema,
  lines: z.array(ProposalLineSchema),
  convertedInvoice: z
    .object({ id: z.string().min(1), number: z.string() })
    .nullable(),
}) satisfies z.ZodType<Quote>

/** The schema for a paginated list of quotes. */
export const QuoteListSchema = listSchema(
  QuoteSchema
) satisfies z.ZodType<QuoteList>

/** Stable public estimate DTO. */
export const EstimateSchema = z.object({
  object: z.literal('estimate'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  number: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED']),
  currency: z.string(),
  issueAt: z.number().int().nullable(),
  expiresAt: z.number().int().nullable(),
  acceptedAt: z.number().int().nullable(),
  declinedAt: z.number().int().nullable(),
  canceledAt: z.number().int().nullable(),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: DocumentCustomerSchema,
  lines: z.array(ProposalLineSchema),
}) satisfies z.ZodType<Estimate>

/** The schema for a paginated list of estimates. */
export const EstimateListSchema = listSchema(
  EstimateSchema
) satisfies z.ZodType<EstimateList>
