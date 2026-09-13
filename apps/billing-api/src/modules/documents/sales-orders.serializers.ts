import { z } from 'zod'

import {
  SalesOrderInvoicingStatusSchema,
  SalesOrderPaymentStatusSchema,
  SalesOrderStatusSchema,
} from './schemas/sales-order'

const minorAmountSchema = z.string().regex(/^\d+$/)
const invoiceStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'UNCOLLECTIBLE',
])

export const salesOrderLineResourceSchema = z.strictObject({
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
  unitAmount: minorAmountSchema,
  taxAmount: minorAmountSchema,
  taxName: z.string().nullable(),
  taxRate: z.string().nullable(),
  taxInclusive: z.boolean(),
  discountAmount: minorAmountSchema,
  totalAmount: minorAmountSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

const salesOrderShape = {
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
  number: z.string(),
  status: SalesOrderStatusSchema,
  invoicingStatus: SalesOrderInvoicingStatusSchema,
  paymentStatus: SalesOrderPaymentStatusSchema.nullable(),
  invoiceId: z.string().nullable(),
  currency: z.string(),
  referenceNumber: z.string().nullable(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  billingAddressSnapshot: z.unknown().nullable(),
  shippingAddressSnapshot: z.unknown().nullable(),
  orderedAt: z.number().int(),
  confirmedAt: z.number().int().nullable(),
  completedAt: z.number().int().nullable(),
  canceledAt: z.number().int().nullable(),
  subtotalAmount: minorAmountSchema,
  taxAmount: minorAmountSchema,
  discountAmount: minorAmountSchema,
  totalAmount: minorAmountSchema,
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
} as const

export const salesOrderSummaryResourceSchema = z.strictObject(salesOrderShape)
export const salesOrderResourceSchema = z.strictObject({
  ...salesOrderShape,
  lines: z.array(salesOrderLineResourceSchema),
})
export const deletedSalesOrderResourceSchema = z.strictObject({
  object: z.literal('sales-order'),
  id: z.string().min(1),
  deleted: z.literal(true),
})

export type SalesOrderSummaryResource = z.infer<
  typeof salesOrderSummaryResourceSchema
>
export type SalesOrderResource = z.infer<typeof salesOrderResourceSchema>

type ActiveInvoice = {
  id: string
  status: z.infer<typeof invoiceStatusSchema> | string
} | null

type BaseRow = {
  id: string
  customerId: string
  customerName: string | null
  customerEmail: string | null
  priceListId: string | null
  priceListName: string | null
  quoteId: string | null
  salespersonId: string | null
  salespersonName: string | null
  number: string
  status: string
  currency: string
  referenceNumber: string | null
  taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  billingAddressSnapshot: unknown
  shippingAddressSnapshot: unknown
  orderedAt: number
  confirmedAt: number | null
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

type LineRow = {
  id: string
  itemId: string | null
  variantId: string | null
  variantName: string | null
  variantSku: string | null
  priceId: string | null
  taxRateId: string | null
  description: string
  unit: string | null
  position: number
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  taxName: string | null
  taxRate: { toString(): string } | string | null
  taxInclusive: boolean
  discountAmount: bigint
  totalAmount: bigint
  createdAt: number
  updatedAt: number
}

function wireStatus(status: string) {
  return status.toLowerCase().replaceAll('_', '-') as z.infer<
    typeof SalesOrderStatusSchema
  >
}

export function derivedSalesOrderFinancialState(invoice: ActiveInvoice) {
  if (!invoice)
    return {
      invoicingStatus: 'not-invoiced' as const,
      paymentStatus: null,
      invoiceId: null,
    }

  return {
    invoicingStatus: 'invoiced' as const,
    paymentStatus:
      invoice.status === 'PAID'
        ? ('paid' as const)
        : invoice.status === 'PARTIALLY_PAID'
          ? ('partially-paid' as const)
          : ('unpaid' as const),
    invoiceId: invoice.id,
  }
}

function serializeBase(
  row: BaseRow,
  activeInvoice: ActiveInvoice
): SalesOrderSummaryResource {
  return {
    object: 'sales-order',
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    priceListId: row.priceListId,
    priceListName: row.priceListName,
    quoteId: row.quoteId,
    salespersonId: row.salespersonId,
    salespersonName: row.salespersonName,
    number: row.number,
    status: wireStatus(row.status),
    ...derivedSalesOrderFinancialState(activeInvoice),
    currency: row.currency,
    referenceNumber: row.referenceNumber,
    taxBehavior: row.taxBehavior,
    billingAddressSnapshot: row.billingAddressSnapshot ?? null,
    shippingAddressSnapshot: row.shippingAddressSnapshot ?? null,
    orderedAt: row.orderedAt,
    confirmedAt: row.confirmedAt,
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

export function serializeSalesOrderSummary(
  row: BaseRow,
  activeInvoice: ActiveInvoice
) {
  return serializeBase(row, activeInvoice)
}

export function serializeSalesOrder(
  row: BaseRow & { lines: LineRow[]; invoices?: Array<{ id: string; status: string }> }
): SalesOrderResource {
  return {
    ...serializeBase(row, row.invoices?.[0] ?? null),
    lines: row.lines.map((line) => ({
      object: 'sales-order-line',
      id: line.id,
      itemId: line.itemId,
      variantId: line.variantId,
      variantName: line.variantName,
      variantSku: line.variantSku,
      priceId: line.priceId,
      taxRateId: line.taxRateId,
      description: line.description,
      unit: line.unit,
      position: line.position,
      quantity: line.quantity,
      unitAmount: line.unitAmount.toString(),
      taxAmount: line.taxAmount.toString(),
      taxName: line.taxName,
      taxRate: line.taxRate === null ? null : line.taxRate.toString(),
      taxInclusive: line.taxInclusive,
      discountAmount: line.discountAmount.toString(),
      totalAmount: line.totalAmount.toString(),
      createdAt: line.createdAt,
      updatedAt: line.updatedAt,
    })),
  }
}
