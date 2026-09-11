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
