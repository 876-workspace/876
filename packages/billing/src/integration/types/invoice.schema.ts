import { z } from 'zod'

import type { BillingInvoice, BillingInvoiceList } from './invoice'
import { sourceSchema } from './customer.schema'

const invoiceStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'UNCOLLECTIBLE',
  'VOID',
])

const billingInvoiceLineSchema = z.strictObject({
  object: z.literal('invoice_line'),
  id: z.string().min(1),
  itemId: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  unit: z.string().nullable(),
  position: z.number().int(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

/**
 * The schema for a Billing invoice resource.
 */
export const BillingInvoiceSchema = z.strictObject({
  object: z.literal('invoice'),
  id: z.string().min(1),
  source: sourceSchema,
  customerId: z.string().min(1),
  quoteId: z.string().nullable(),
  estimateId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  number: z.string(),
  status: invoiceStatusSchema,
  billingReason: z.string(),
  currency: z.string().length(3),
  orderNumber: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  subject: z.string().nullable(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  issueAt: z.number().int().nullable(),
  dueAt: z.number().int().nullable(),
  sentAt: z.number().int().nullable(),
  paidAt: z.number().int().nullable(),
  voidedAt: z.number().int().nullable(),
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
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: z
    .strictObject({
      object: z.literal('customer'),
      id: z.string().min(1),
      name: z.string(),
    })
    .optional(),
  lines: z.array(billingInvoiceLineSchema).optional(),
}) satisfies z.ZodType<BillingInvoice>

/**
 * The schema for a paginated list of Billing invoices.
 */
export const BillingInvoiceListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingInvoiceSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingInvoiceList>
