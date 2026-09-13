import {
  getError,
  isError,
  type Error as AppErrorValue,
} from '@876/core'
import { nowUnixSeconds } from '@876/core/timestamps'

import type { SalesOrderStatus as DbSalesOrderStatus } from '@/db'
import { buildCommercialLines } from '@/modules/commercial-lines'
import { resolveCommercialCustomer } from '@/modules/customers'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import { isUniqueConstraintError } from '@/platform/prisma-errors'

import {
  createSalesOrderRow,
  deleteDraftSalesOrderRow,
  findSalesOrderRow,
  listSalesOrderRows,
  transitionSalesOrderRow,
  updateDraftSalesOrderRow,
  type SalesOrderLineWrite,
  type SalesOrderListFilters,
} from './sales-orders.repository'
import {
  salesOrderResource,
  salesOrderSummaryResource,
  type SalesOrderResource,
  type SalesOrderSummaryResource,
} from './sales-orders.resources'
import type {
  SalesOrderCreateBody,
  SalesOrderFulfillmentStatus,
  SalesOrderLineInput,
  SalesOrderListQuery,
  SalesOrderPaymentStatus,
  SalesOrderStatus,
  SalesOrderUpdateBody,
} from './sales-orders.schemas'

export type SalesOrderResult<T> = Promise<T | AppErrorValue>

const DB_STATUS: Record<SalesOrderStatus, DbSalesOrderStatus> = {
  draft: 'DRAFT',
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  processing: 'PROCESSING',
  completed: 'COMPLETED',
  canceled: 'CANCELED',
}

const DB_PAYMENT_STATUS: Record<
  SalesOrderPaymentStatus,
  SalesOrderListFilters['paymentStatus']
> = {
  unpaid: 'UNPAID',
  'partially-paid': 'PARTIALLY_PAID',
  paid: 'PAID',
  'partially-refunded': 'PARTIALLY_REFUNDED',
  refunded: 'REFUNDED',
}

const DB_FULFILLMENT_STATUS: Record<
  SalesOrderFulfillmentStatus,
  SalesOrderListFilters['fulfillmentStatus']
> = {
  unfulfilled: 'UNFULFILLED',
  'partially-fulfilled': 'PARTIALLY_FULFILLED',
  fulfilled: 'FULFILLED',
}

function defaultNumber(id: string): string {
  return `SO-${id.slice(-12).toUpperCase()}`
}

function writeLines(
  lines: Array<{
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
  }>,
  now: number
): SalesOrderLineWrite[] {
  return lines.map((line) => ({
    id: generateId('SalesOrderLine'),
    ...line,
    createdAt: now,
    updatedAt: now,
  }))
}

async function prepareCommercialOrder(options: {
  tenantId: string
  currency: string
  lines: SalesOrderLineInput[]
  priceListId: string | null
  now: number
}) {
  if (!(await hasEnabledCurrency(options.tenantId, options.currency)))
    return getError('billing/sales-order-currency-disabled')

  const prepared = await buildCommercialLines(
    options.tenantId,
    options.currency,
    options.lines,
    options.priceListId
  )
  if (prepared.error !== null)
    return getError('billing/sales-order-invalid-lines')

  return {
    priceListId: prepared.data.priceList?.id ?? null,
    priceListName: prepared.data.priceList?.name ?? null,
    subtotalAmount: prepared.data.subtotalAmount,
    taxAmount: prepared.data.taxAmount,
    discountAmount: prepared.data.discountAmount,
    totalAmount: prepared.data.totalAmount,
    lines: writeLines(prepared.data.lines, options.now),
  }
}

async function currentOrder(tenantId: string, salesOrderId: string) {
  const row = await findSalesOrderRow(tenantId, salesOrderId)
  return row ?? getError('billing/sales-order-not-found')
}

export async function listSalesOrders(
  tenantId: string,
  query: SalesOrderListQuery
): SalesOrderResult<{
  data: SalesOrderSummaryResource[]
  hasMore: boolean
}> {
  const rows = await listSalesOrderRows(tenantId, {
    ...(query.status ? { status: DB_STATUS[query.status] } : {}),
    ...(query.paymentStatus
      ? { paymentStatus: DB_PAYMENT_STATUS[query.paymentStatus] }
      : {}),
    ...(query.fulfillmentStatus
      ? {
          fulfillmentStatus:
            DB_FULFILLMENT_STATUS[query.fulfillmentStatus],
        }
      : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
  })

  return {
    data: rows.slice(0, 100).map(salesOrderSummaryResource),
    hasMore: rows.length > 100,
  }
}

export async function retrieveSalesOrder(
  tenantId: string,
  salesOrderId: string
): SalesOrderResult<SalesOrderResource> {
  const row = await currentOrder(tenantId, salesOrderId)
  return isError(row) ? row : salesOrderResource(row)
}

export async function createSalesOrder(
  tenantId: string,
  body: SalesOrderCreateBody
): SalesOrderResult<SalesOrderResource> {
  const customer = await resolveCommercialCustomer(tenantId, body.customerId)
  if (!customer) return getError('billing/sales-order-customer-not-found')

  const priceListId =
    body.priceListId === undefined ? customer.priceListId : body.priceListId
  const now = nowUnixSeconds()
  const prepared = await prepareCommercialOrder({
    tenantId,
    currency: body.currency,
    lines: body.lines,
    priceListId,
    now,
  })
  if (isError(prepared)) return prepared

  const id = generateId('SalesOrder')
  try {
    const row = await createSalesOrderRow({
      id,
      tenantId,
      customerId: customer.id,
      number: body.number ?? defaultNumber(id),
      currency: body.currency,
      orderedAt: body.orderedAt ?? null,
      notes: body.notes ?? null,
      terms: body.terms ?? null,
      metadata: body.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      ...prepared,
    })
    return salesOrderResource(row)
  } catch (error) {
    if (isUniqueConstraintError(error))
      return getError('billing/sales-order-conflict')
    throw error
  }
}

function commercialContextChanged(body: SalesOrderUpdateBody): boolean {
  return (
    body.customerId !== undefined ||
    body.currency !== undefined ||
    body.priceListId !== undefined
  )
}

export async function updateSalesOrder(
  tenantId: string,
  salesOrderId: string,
  body: SalesOrderUpdateBody
): SalesOrderResult<SalesOrderResource> {
  const current = await currentOrder(tenantId, salesOrderId)
  if (isError(current)) return current
  if (current.status !== 'DRAFT')
    return getError('billing/sales-order-invalid-state')

  if (commercialContextChanged(body) && body.lines === undefined)
    return getError('billing/sales-order-invalid-lines')

  const customerId = body.customerId ?? current.customerId
  const customer = await resolveCommercialCustomer(tenantId, customerId)
  if (!customer) return getError('billing/sales-order-customer-not-found')

  const now = nowUnixSeconds()
  const priceListId =
    body.priceListId !== undefined
      ? body.priceListId
      : body.customerId !== undefined
        ? customer.priceListId
        : current.priceListId

  const prepared = body.lines
    ? await prepareCommercialOrder({
        tenantId,
        currency: body.currency ?? current.currency,
        lines: body.lines,
        priceListId,
        now,
      })
    : null
  if (prepared && isError(prepared)) return prepared

  try {
    const row = await updateDraftSalesOrderRow(tenantId, salesOrderId, {
      ...(body.customerId !== undefined ? { customerId } : {}),
      ...(body.number !== undefined ? { number: body.number } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.orderedAt !== undefined ? { orderedAt: body.orderedAt } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.terms !== undefined ? { terms: body.terms } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      ...(prepared ?? {}),
      updatedAt: now,
    })
    return row
      ? salesOrderResource(row)
      : getError('billing/sales-order-invalid-state')
  } catch (error) {
    if (isUniqueConstraintError(error))
      return getError('billing/sales-order-conflict')
    throw error
  }
}

export async function deleteSalesOrder(
  tenantId: string,
  salesOrderId: string
): SalesOrderResult<{ object: 'sales-order'; id: string; deleted: true }> {
  const current = await currentOrder(tenantId, salesOrderId)
  if (isError(current)) return current
  if (current.status !== 'DRAFT')
    return getError('billing/sales-order-invalid-state')

  const deleted = await deleteDraftSalesOrderRow(tenantId, salesOrderId)
  return deleted
    ? { object: 'sales-order', id: salesOrderId, deleted: true }
    : getError('billing/sales-order-invalid-state')
}

async function transition(options: {
  tenantId: string
  salesOrderId: string
  from: DbSalesOrderStatus[]
  to: DbSalesOrderStatus
  timestampField?:
    | 'orderedAt'
    | 'confirmedAt'
    | 'processingAt'
    | 'completedAt'
    | 'canceledAt'
}): SalesOrderResult<SalesOrderResource> {
  const current = await currentOrder(options.tenantId, options.salesOrderId)
  if (isError(current)) return current
  if (!options.from.includes(current.status))
    return getError('billing/sales-order-invalid-state')

  const now = nowUnixSeconds()
  const timestampField =
    options.timestampField === 'orderedAt' && current.orderedAt !== null
      ? undefined
      : options.timestampField
  const row = await transitionSalesOrderRow({
    tenantId: options.tenantId,
    salesOrderId: options.salesOrderId,
    from: options.from,
    to: options.to,
    ...(timestampField ? { timestampField } : {}),
    now,
  })
  return row
    ? salesOrderResource(row)
    : getError('billing/sales-order-invalid-state')
}

export function submitSalesOrder(tenantId: string, salesOrderId: string) {
  return transition({
    tenantId,
    salesOrderId,
    from: ['DRAFT'],
    to: 'PENDING',
    timestampField: 'orderedAt',
  })
}

export function confirmSalesOrder(tenantId: string, salesOrderId: string) {
  return transition({
    tenantId,
    salesOrderId,
    from: ['PENDING'],
    to: 'CONFIRMED',
    timestampField: 'confirmedAt',
  })
}

export function startSalesOrderProcessing(
  tenantId: string,
  salesOrderId: string
) {
  return transition({
    tenantId,
    salesOrderId,
    from: ['CONFIRMED'],
    to: 'PROCESSING',
    timestampField: 'processingAt',
  })
}

export function completeSalesOrder(tenantId: string, salesOrderId: string) {
  return transition({
    tenantId,
    salesOrderId,
    from: ['PROCESSING'],
    to: 'COMPLETED',
    timestampField: 'completedAt',
  })
}

export function cancelSalesOrder(tenantId: string, salesOrderId: string) {
  return transition({
    tenantId,
    salesOrderId,
    from: ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING'],
    to: 'CANCELED',
    timestampField: 'canceledAt',
  })
}
