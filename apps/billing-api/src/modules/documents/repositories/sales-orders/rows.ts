import { Prisma, type SalesOrderStatus } from '@/db'
import { prisma } from '@/db/client'
import type { CommercialLineSnapshot } from '@/types/commercial-line'

import type { SalesOrderListQuery } from '../../schemas/sales-order'

export function runSalesOrderTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(work, { isolationLevel: 'Serializable' })
}

export async function listSalesOrderRows(
  tenantId: string,
  query: SalesOrderListQuery,
  status?: SalesOrderStatus
) {
  const reverse = Boolean(query.ending_before)
  const cursorId = query.starting_after ?? query.ending_before
  const rows = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    },
    orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    take: reverse ? -(query.limit + 1) : query.limit + 1,
  })

  const normalized = reverse ? rows.reverse() : rows
  const page = normalized.slice(0, query.limit)
  const ids = page.map((row) => row.id)
  const invoices =
    ids.length === 0
      ? []
      : await prisma.invoice.findMany({
          where: {
            tenantId,
            salesOrderId: { in: ids },
            status: { not: 'VOID' },
          },
          select: { id: true, salesOrderId: true, status: true },
          orderBy: { createdAt: 'desc' },
        })

  const activeInvoiceByOrderId = new Map(
    invoices.flatMap((invoice) =>
      invoice.salesOrderId && !invoicesSeenBefore(invoices, invoice)
        ? [[invoice.salesOrderId, invoice] as const]
        : []
    )
  )

  return {
    rows: page,
    activeInvoiceByOrderId,
    hasMore: normalized.length > query.limit,
  }
}

function invoicesSeenBefore<T extends { id: string; salesOrderId: string | null }>(
  invoices: T[],
  current: T
) {
  const index = invoices.indexOf(current)
  return invoices
    .slice(0, index)
    .some((invoice) => invoice.salesOrderId === current.salesOrderId)
}

export function findSalesOrderRow(tenantId: string, salesOrderId: string) {
  return prisma.salesOrder.findFirst({
    where: { tenantId, id: salesOrderId },
    include: {
      lines: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      invoices: {
        where: { status: { not: 'VOID' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true },
      },
    },
  })
}

export function findSalesOrderForLifecycle(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesOrderId: string
) {
  return tx.salesOrder.findFirst({
    where: { tenantId, id: salesOrderId },
    select: { id: true, status: true },
  })
}

export function findActiveInvoiceForSalesOrder(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesOrderId: string
) {
  return tx.invoice.findFirst({
    where: { tenantId, salesOrderId, status: { not: 'VOID' } },
    select: { id: true, status: true },
    orderBy: { createdAt: 'desc' },
  })
}

export function applySalesOrderTransition(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    salesOrderId: string
    from: SalesOrderStatus
    to: SalesOrderStatus
    timestamp: 'confirmedAt' | 'completedAt' | 'canceledAt'
    now: number
  }
) {
  return tx.salesOrder.updateMany({
    where: {
      tenantId: input.tenantId,
      id: input.salesOrderId,
      status: input.from,
    },
    data: {
      status: input.to,
      [input.timestamp]: input.now,
      updatedAt: input.now,
    },
  })
}

export function createSalesOrderRow(
  tx: Prisma.TransactionClient,
  input: {
    id: string
    tenantId: string
    customerId: string
    quoteId?: string | null
    salespersonId?: string | null
    salespersonName?: string | null
    priceListId?: string | null
    priceListName?: string | null
    number: string
    currency: string
    referenceNumber?: string | null
    taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
    customerName?: string | null
    customerEmail?: string | null
    billingAddressSnapshot?: Prisma.InputJsonValue | null
    shippingAddressSnapshot?: Prisma.InputJsonValue | null
    orderedAt: number
    subtotalAmount: bigint
    taxAmount: bigint
    discountAmount: bigint
    totalAmount: bigint
    notes?: string | null
    terms?: string | null
    metadata?: Record<string, unknown> | null
    sourceAppId?: string | null
    sourceExternalReference?: string | null
    sourceIdempotencyKey?: string | null
    sourcePayloadHash?: string | null
    lines: CommercialLineSnapshot[]
    now: number
  }
) {
  return tx.salesOrder.create({
    data: {
      id: input.id,
      tenantId: input.tenantId,
      customerId: input.customerId,
      quoteId: input.quoteId ?? null,
      salespersonId: input.salespersonId ?? null,
      salespersonName: input.salespersonName ?? null,
      priceListId: input.priceListId ?? null,
      priceListName: input.priceListName ?? null,
      number: input.number,
      status: 'DRAFT',
      currency: input.currency,
      referenceNumber: input.referenceNumber ?? null,
      taxBehavior: input.taxBehavior,
      customerName: input.customerName ?? null,
      customerEmail: input.customerEmail ?? null,
      billingAddressSnapshot: input.billingAddressSnapshot ?? undefined,
      shippingAddressSnapshot: input.shippingAddressSnapshot ?? undefined,
      orderedAt: input.orderedAt,
      subtotalAmount: input.subtotalAmount,
      taxAmount: input.taxAmount,
      discountAmount: input.discountAmount,
      totalAmount: input.totalAmount,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      metadata:
        input.metadata === null
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue | undefined),
      sourceAppId: input.sourceAppId ?? null,
      sourceExternalReference: input.sourceExternalReference ?? null,
      sourceIdempotencyKey: input.sourceIdempotencyKey ?? null,
      sourcePayloadHash: input.sourcePayloadHash ?? null,
      createdAt: input.now,
      updatedAt: input.now,
      lines: {
        create: input.lines.map((line, position) => ({
          id: inputLineId(line, position, input.id),
          ...line,
          position,
          createdAt: input.now,
          updatedAt: input.now,
        })),
      },
    },
    include: {
      lines: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      invoices: {
        where: { status: { not: 'VOID' } },
        take: 1,
        select: { id: true, status: true },
      },
    },
  })
}

/** IDs are supplied by the workflow; this helper exists only to keep the input shape compact. */
function inputLineId(
  line: CommercialLineSnapshot & { id?: string },
  position: number,
  salesOrderId: string
) {
  if (line.id) return line.id
  throw new Error(
    `Sales Order ${salesOrderId} line ${position} is missing its generated id.`
  )
}

export async function updateDraftSalesOrderRow(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    salesOrderId: string
    customerId?: string
    salespersonId?: string | null
    salespersonName?: string | null
    priceListId?: string | null
    priceListName?: string | null
    currency?: string
    referenceNumber?: string | null
    taxBehavior?: 'EXCLUSIVE' | 'INCLUSIVE'
    customerName?: string | null
    customerEmail?: string | null
    billingAddressSnapshot?: Prisma.InputJsonValue | null
    shippingAddressSnapshot?: Prisma.InputJsonValue | null
    orderedAt?: number
    subtotalAmount?: bigint
    taxAmount?: bigint
    discountAmount?: bigint
    totalAmount?: bigint
    notes?: string | null
    terms?: string | null
    metadata?: Record<string, unknown> | null
    lines?: Array<CommercialLineSnapshot & { id: string }>
    now: number
  }
) {
  const changed = await tx.salesOrder.updateMany({
    where: { tenantId: input.tenantId, id: input.salesOrderId, status: 'DRAFT' },
    data: {
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      ...(input.salespersonId !== undefined
        ? { salespersonId: input.salespersonId }
        : {}),
      ...(input.salespersonName !== undefined
        ? { salespersonName: input.salespersonName }
        : {}),
      ...(input.priceListId !== undefined ? { priceListId: input.priceListId } : {}),
      ...(input.priceListName !== undefined
        ? { priceListName: input.priceListName }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.referenceNumber !== undefined
        ? { referenceNumber: input.referenceNumber }
        : {}),
      ...(input.taxBehavior !== undefined ? { taxBehavior: input.taxBehavior } : {}),
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
      ...(input.customerEmail !== undefined
        ? { customerEmail: input.customerEmail }
        : {}),
      ...(input.billingAddressSnapshot !== undefined
        ? { billingAddressSnapshot: input.billingAddressSnapshot ?? Prisma.JsonNull }
        : {}),
      ...(input.shippingAddressSnapshot !== undefined
        ? { shippingAddressSnapshot: input.shippingAddressSnapshot ?? Prisma.JsonNull }
        : {}),
      ...(input.orderedAt !== undefined ? { orderedAt: input.orderedAt } : {}),
      ...(input.subtotalAmount !== undefined
        ? { subtotalAmount: input.subtotalAmount }
        : {}),
      ...(input.taxAmount !== undefined ? { taxAmount: input.taxAmount } : {}),
      ...(input.discountAmount !== undefined
        ? { discountAmount: input.discountAmount }
        : {}),
      ...(input.totalAmount !== undefined ? { totalAmount: input.totalAmount } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.terms !== undefined ? { terms: input.terms } : {}),
      ...(input.metadata !== undefined
        ? {
            metadata:
              input.metadata === null
                ? Prisma.JsonNull
                : (input.metadata as Prisma.InputJsonValue),
          }
        : {}),
      updatedAt: input.now,
    },
  })
  if (changed.count === 0) return null

  if (input.lines !== undefined) {
    await tx.salesOrderLine.deleteMany({ where: { salesOrderId: input.salesOrderId } })
    await tx.salesOrderLine.createMany({
      data: input.lines.map((line, position) => ({
        ...line,
        salesOrderId: input.salesOrderId,
        position,
        createdAt: input.now,
        updatedAt: input.now,
      })),
    })
  }

  return tx.salesOrder.findFirst({
    where: { tenantId: input.tenantId, id: input.salesOrderId },
    include: {
      lines: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      invoices: {
        where: { status: { not: 'VOID' } },
        take: 1,
        select: { id: true, status: true },
      },
    },
  })
}

export function deleteDraftSalesOrderRow(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesOrderId: string
) {
  return tx.salesOrder.deleteMany({
    where: { tenantId, id: salesOrderId, status: 'DRAFT' },
  })
}
