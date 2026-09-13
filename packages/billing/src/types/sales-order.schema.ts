import { z } from 'zod'

import { deletedResourceSchema, listSchema } from './common.schema'
import type {
  DeletedSalesOrder,
  SalesOrder,
  SalesOrderFulfillmentStatus,
  SalesOrderList,
  SalesOrderLine,
  SalesOrderPaymentStatus,
  SalesOrderStatus,
  SalesOrderSummary,
} from './sales-order'

const statusSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'processing',
  'completed',
  'canceled',
]) satisfies z.ZodType<SalesOrderStatus>

const paymentStatusSchema = z.enum([
  'unpaid',
  'partially-paid',
  'paid',
  'partially-refunded',
  'refunded',
]) satisfies z.ZodType<SalesOrderPaymentStatus>

const fulfillmentStatusSchema = z.enum([
  'unfulfilled',
  'partially-fulfilled',
  'fulfilled',
]) satisfies z.ZodType<SalesOrderFulfillmentStatus>

export const SalesOrderLineSchema = z.strictObject({
  object: z.literal('sales-order-line'),
  id: z.string().min(1),
  itemId: z.string().nullable(),
  variantId: z.string().nullable(),
  variantName: z.string().nullable(),
  variantSku: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  unit: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<SalesOrderLine>

const summaryShape = {
  object: z.literal('sales-order'),
  id: z.string().min(1),
  customerId: z.string().min(1),
  priceListId: z.string().nullable(),
  priceListName: z.string().nullable(),
  number: z.string().min(1),
  status: statusSchema,
  paymentStatus: paymentStatusSchema,
  fulfillmentStatus: fulfillmentStatusSchema,
  currency: z.string().min(1),
  orderedAt: z.number().int().nullable(),
  confirmedAt: z.number().int().nullable(),
  processingAt: z.number().int().nullable(),
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

export const DeletedSalesOrderSchema = deletedResourceSchema(
  'sales-order'
) satisfies z.ZodType<DeletedSalesOrder>

export const SalesOrderListSchema = listSchema(
  SalesOrderSummarySchema
) satisfies z.ZodType<SalesOrderList>
