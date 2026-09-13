import { z } from 'zod'

import { listSchema } from './common.schema'
import type {
  SalesOrder,
  SalesOrderInvoicingStatus,
  SalesOrderList,
  SalesOrderLine,
  SalesOrderPaymentStatus,
  SalesOrderStatus,
  SalesOrderSummary,
} from './sales-order'

const statusSchema = z.enum([
  'draft',
  'confirmed',
  'completed',
  'canceled',
]) satisfies z.ZodType<SalesOrderStatus>

const invoicingStatusSchema = z.enum([
  'not-invoiced',
  'invoiced',
]) satisfies z.ZodType<SalesOrderInvoicingStatus>

const paymentStatusSchema = z.enum([
  'unpaid',
  'partially-paid',
  'paid',
]) satisfies z.ZodType<SalesOrderPaymentStatus>

export const SalesOrderLineSchema = z.strictObject({
  object: z.literal('sales-order-line'),
  id: z.string().min(1),
  itemId: z.string().nullable(),
  variantId: z.string().nullable(),
  variantName: z.string().nullable(),
  variantSku: z.string().nullable(),
  priceId: z.string().nullable(),
  taxRateId: z.string().nullable(),
  description: z.string(),
  unit: z.string().nullable(),
  position: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  taxName: z.string().nullable(),
  taxRate: z.string().nullable(),
  taxInclusive: z.boolean(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<SalesOrderLine>

const summaryShape = {
  object: z.literal('sales-order'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  priceListId: z.string().nullable(),
  priceListName: z.string().nullable(),
  quoteId: z.string().nullable(),
  salespersonId: z.string().nullable(),
  salespersonName: z.string().nullable(),
  number: z.string().min(1),
  status: statusSchema,
  invoicingStatus: invoicingStatusSchema,
  paymentStatus: paymentStatusSchema.nullable(),
  invoiceId: z.string().nullable(),
  currency: z.string().min(1),
  referenceNumber: z.string().nullable(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  billingAddressSnapshot: z.json().nullable(),
  shippingAddressSnapshot: z.json().nullable(),
  orderedAt: z.number().int(),
  confirmedAt: z.number().int().nullable(),
  completedAt: z.number().int().nullable(),
  canceledAt: z.number().int().nullable(),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  metadata: z.json().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
} as const

export const SalesOrderSummarySchema = z.strictObject(
  summaryShape
) satisfies z.ZodType<SalesOrderSummary>

export const SalesOrderSchema = z.strictObject({
  ...summaryShape,
  lines: z.array(SalesOrderLineSchema),
}) satisfies z.ZodType<SalesOrder>

export const SalesOrderListSchema = listSchema(
  SalesOrderSummarySchema
) satisfies z.ZodType<SalesOrderList>
