import { z } from 'zod'

import {
  SalesOrderFulfillmentStatusSchema,
  SalesOrderPaymentStatusSchema,
  SalesOrderStatusSchema,
  type SalesOrderFulfillmentStatus,
  type SalesOrderPaymentStatus,
  type SalesOrderStatus,
} from './sales-orders.schemas'

const minorAmountResourceSchema = z.string().regex(/^\d+$/)

export const salesOrderLineResourceSchema = z.strictObject({
  object: z.literal('sales-order-line'),
  id: z.string(),
  itemId: z.string().nullable(),
  variantId: z.string().nullable(),
  variantName: z.string().nullable(),
  variantSku: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  unit: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitAmount: minorAmountResourceSchema,
  taxAmount: minorAmountResourceSchema,
  discountAmount: minorAmountResourceSchema,
  totalAmount: minorAmountResourceSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

const salesOrderBaseResourceShape = {
  object: z.literal('sales-order'),
  id: z.string(),
  customerId: z.string(),
  priceListId: z.string().nullable(),
  priceListName: z.string().nullable(),
  number: z.string(),
  status: SalesOrderStatusSchema,
  paymentStatus: SalesOrderPaymentStatusSchema,
  fulfillmentStatus: SalesOrderFulfillmentStatusSchema,
  currency: z.string(),
  orderedAt: z.number().int().nullable(),
  confirmedAt: z.number().int().nullable(),
  processingAt: z.number().int().nullable(),
  completedAt: z.number().int().nullable(),
  canceledAt: z.number().int().nullable(),
  subtotalAmount: minorAmountResourceSchema,
  taxAmount: minorAmountResourceSchema,
  discountAmount: minorAmountResourceSchema,
  totalAmount: minorAmountResourceSchema,
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
} as const

export const salesOrderSummaryResourceSchema = z.strictObject(
  salesOrderBaseResourceShape
)

export const salesOrderResourceSchema = z.strictObject({
  ...salesOrderBaseResourceShape,
  lines: z.array(salesOrderLineResourceSchema),
})

export const salesOrderDeletedResourceSchema = z.strictObject({
  object: z.literal('sales-order'),
  id: z.string(),
  deleted: z.literal(true),
})

export type SalesOrderSummaryResource = z.infer<
  typeof salesOrderSummaryResourceSchema
>
export type SalesOrderResource = z.infer<typeof salesOrderResourceSchema>

interface SalesOrderBaseRow {
  id: string
  customerId: string
  priceListId: string | null
  priceListName: string | null
  number: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  currency: string
  orderedAt: number | null
  confirmedAt: number | null
  processingAt: number | null
  completedAt: number | null
  canceledAt: number | null
  subtotalAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  notes: string | null
  terms: string | null
  metadata: unknown
  createdAt: number
  updatedAt: number
}

interface SalesOrderLineRow {
  id: string
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  description: string
  unit: string | null
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  createdAt: number
  updatedAt: number
}

function wireStatus(value: string): string {
  return value.toLowerCase().replaceAll('_', '-')
}

function serializeBase(row: SalesOrderBaseRow): SalesOrderSummaryResource {
  return {
    object: 'sales-order',
    id: row.id,
    customerId: row.customerId,
    priceListId: row.priceListId,
    priceListName: row.priceListName,
    number: row.number,
    status: wireStatus(row.status) as SalesOrderStatus,
    paymentStatus: wireStatus(row.paymentStatus) as SalesOrderPaymentStatus,
    fulfillmentStatus: wireStatus(
      row.fulfillmentStatus
    ) as SalesOrderFulfillmentStatus,
    currency: row.currency,
    orderedAt: row.orderedAt,
    confirmedAt: row.confirmedAt,
    processingAt: row.processingAt,
    completedAt: row.completedAt,
    canceledAt: row.canceledAt,
    subtotalAmount: row.subtotalAmount.toString(),
    taxAmount: row.taxAmount.toString(),
    discountAmount: row.discountAmount.toString(),
    totalAmount: row.totalAmount.toString(),
    notes: row.notes,
    terms: row.terms,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function salesOrderSummaryResource(
  row: SalesOrderBaseRow
): SalesOrderSummaryResource {
  return serializeBase(row)
}

export function salesOrderResource(
  row: SalesOrderBaseRow & { lines: SalesOrderLineRow[] }
): SalesOrderResource {
  return {
    ...serializeBase(row),
    lines: row.lines.map((line) => ({
      object: 'sales-order-line',
      id: line.id,
      itemId: line.itemId,
      variantId: line.variantId,
      variantName: line.variantName,
      variantSku: line.variantSku,
      priceId: line.priceId,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      unitAmount: line.unitAmount.toString(),
      taxAmount: line.taxAmount.toString(),
      discountAmount: line.discountAmount.toString(),
      totalAmount: line.totalAmount.toString(),
      createdAt: line.createdAt,
      updatedAt: line.updatedAt,
    })),
  }
}
