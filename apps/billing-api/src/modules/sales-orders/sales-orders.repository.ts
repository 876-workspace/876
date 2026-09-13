import { Prisma, type SalesOrderStatus } from '@/db'
import { prisma } from '@/db/client'

export interface SalesOrderLineWrite {
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

export interface SalesOrderCreateRecord {
  id: string
  tenantId: string
  customerId: string
  priceListId: string | null
  priceListName: string | null
  number: string
  currency: string
  orderedAt: number | null
  subtotalAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  notes: string | null
  terms: string | null
  metadata?: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lines: SalesOrderLineWrite[]
}

export interface SalesOrderUpdateRecord {
  customerId?: string
  priceListId?: string | null
  priceListName?: string | null
  number?: string
  currency?: string
  orderedAt?: number | null
  subtotalAmount?: bigint
  taxAmount?: bigint
  discountAmount?: bigint
  totalAmount?: bigint
  notes?: string | null
  terms?: string | null
  metadata?: Record<string, unknown> | null
  updatedAt: number
  lines?: SalesOrderLineWrite[]
}

export interface SalesOrderListFilters {
  status?: SalesOrderStatus
  paymentStatus?:
    | 'UNPAID'
    | 'PARTIALLY_PAID'
    | 'PAID'
    | 'PARTIALLY_REFUNDED'
    | 'REFUNDED'
  fulfillmentStatus?: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED'
  customerId?: string
}

const lineOrder = [{ createdAt: 'asc' as const }, { id: 'asc' as const }]

function jsonValue(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

export function listSalesOrderRows(
  tenantId: string,
  filters: SalesOrderListFilters
) {
  return prisma.salesOrder.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.fulfillmentStatus
        ? { fulfillmentStatus: filters.fulfillmentStatus }
        : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 101,
  })
}

export function findSalesOrderRow(tenantId: string, salesOrderId: string) {
  return prisma.salesOrder.findFirst({
    where: { tenantId, id: salesOrderId },
    include: { lines: { orderBy: lineOrder } },
  })
}

export function createSalesOrderRow(record: SalesOrderCreateRecord) {
  const { lines, metadata, ...order } = record
  return prisma.salesOrder.create({
    data: {
      ...order,
      metadata: jsonValue(metadata),
      lines: { create: lines },
    },
    include: { lines: { orderBy: lineOrder } },
  })
}

export async function updateDraftSalesOrderRow(
  tenantId: string,
  salesOrderId: string,
  record: SalesOrderUpdateRecord
) {
  const { lines, metadata, ...order } = record

  return prisma.$transaction(async (tx) => {
    const updated = await tx.salesOrder.updateMany({
      where: { tenantId, id: salesOrderId, status: 'DRAFT' },
      data: {
        ...order,
        ...(metadata === undefined ? {} : { metadata: jsonValue(metadata) }),
      },
    })
    if (updated.count === 0) return null

    if (lines !== undefined) {
      await tx.salesOrderLine.deleteMany({ where: { salesOrderId } })
      if (lines.length > 0) await tx.salesOrderLine.createMany({ data: lines.map((line) => ({ ...line, salesOrderId })) })
    }

    return tx.salesOrder.findFirst({
      where: { tenantId, id: salesOrderId },
      include: { lines: { orderBy: lineOrder } },
    })
  })
}

export async function transitionSalesOrderRow(options: {
  tenantId: string
  salesOrderId: string
  from: SalesOrderStatus[]
  to: SalesOrderStatus
  timestampField?:
    | 'orderedAt'
    | 'confirmedAt'
    | 'processingAt'
    | 'completedAt'
    | 'canceledAt'
  now: number
}) {
  const updated = await prisma.salesOrder.updateMany({
    where: {
      tenantId: options.tenantId,
      id: options.salesOrderId,
      status: { in: options.from },
    },
    data: {
      status: options.to,
      updatedAt: options.now,
      ...(options.timestampField
        ? { [options.timestampField]: options.now }
        : {}),
    },
  })
  if (updated.count === 0) return null

  return findSalesOrderRow(options.tenantId, options.salesOrderId)
}

export async function deleteDraftSalesOrderRow(
  tenantId: string,
  salesOrderId: string
) {
  const result = await prisma.salesOrder.deleteMany({
    where: { tenantId, id: salesOrderId, status: 'DRAFT' },
  })
  return result.count > 0
}
