import { AppHttpError } from '@/http/errors'
import type { IdempotencyContext } from '@/types/commerce'

import { findSalesOrderRow, listSalesOrderRows } from './repositories/sales-orders'
import type { ServiceResult } from './schemas/api'
import type {
  SalesOrderCreateParams,
  SalesOrderListQuery,
  SalesOrderQuoteConversionParams,
  SalesOrderStatus,
  SalesOrderUpdateParams,
} from './schemas/sales-order'
import {
  serializeSalesOrder,
  serializeSalesOrderSummary,
} from './sales-orders.serializers'
import {
  convertQuoteToSalesOrderWorkflow,
  convertSalesOrderToInvoiceWorkflow,
  createSalesOrderWorkflow,
  transitionSalesOrderWorkflow,
  updateSalesOrderWorkflow,
} from './workflows'

const DB_STATUS: Record<
  SalesOrderStatus,
  'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
> = {
  draft: 'DRAFT',
  confirmed: 'CONFIRMED',
  completed: 'COMPLETED',
  canceled: 'CANCELED',
}

async function unwrap<T>(result: Awaited<ServiceResult<T>>): Promise<T> {
  if (result.error === null) return result.data
  throw new AppHttpError({
    code: result.code ?? 'internal/error',
    message: result.error,
    httpStatus: result.status ?? 500,
  })
}

async function resource(tenantId: string, salesOrderId: string) {
  const row = await findSalesOrderRow(tenantId, salesOrderId)
  if (!row)
    throw new AppHttpError({
      code: 'billing/sales-order-not-found',
      message: 'The Sales Order was not found.',
      httpStatus: 404,
    })
  return serializeSalesOrder(row)
}

export const salesOrdersService = {
  async list(tenantId: string, query: SalesOrderListQuery) {
    const result = await listSalesOrderRows(
      tenantId,
      query,
      query.status ? DB_STATUS[query.status] : undefined
    )
    return {
      object: 'list' as const,
      data: result.rows.map((row) =>
        serializeSalesOrderSummary(
          row,
          result.activeInvoiceByOrderId.get(row.id) ?? null
        )
      ),
      has_more: result.hasMore,
      total_count: null,
      url: '/api/v1/sales-orders',
    }
  },

  get: resource,

  async create(
    tenantId: string,
    body: SalesOrderCreateParams,
    idempotency?: IdempotencyContext
  ) {
    const result = await unwrap(
      await createSalesOrderWorkflow(tenantId, body, idempotency)
    )
    return {
      resource: await resource(tenantId, result.id),
      replayed: result.replayed === true,
    }
  },

  async update(
    tenantId: string,
    salesOrderId: string,
    body: SalesOrderUpdateParams
  ) {
    const result = await unwrap(
      await updateSalesOrderWorkflow(tenantId, salesOrderId, body)
    )
    return resource(tenantId, result.id)
  },

  async confirm(
    tenantId: string,
    salesOrderId: string,
    idempotency?: IdempotencyContext
  ) {
    const result = await unwrap(
      await transitionSalesOrderWorkflow(
        tenantId,
        salesOrderId,
        'confirm',
        idempotency
      )
    )
    return resource(tenantId, result.id)
  },

  async cancel(
    tenantId: string,
    salesOrderId: string,
    idempotency?: IdempotencyContext
  ) {
    const result = await unwrap(
      await transitionSalesOrderWorkflow(
        tenantId,
        salesOrderId,
        'cancel',
        idempotency
      )
    )
    return resource(tenantId, result.id)
  },

  async complete(
    tenantId: string,
    salesOrderId: string,
    idempotency?: IdempotencyContext
  ) {
    const result = await unwrap(
      await transitionSalesOrderWorkflow(
        tenantId,
        salesOrderId,
        'complete',
        idempotency
      )
    )
    return resource(tenantId, result.id)
  },

  async convertQuote(
    tenantId: string,
    quoteId: string,
    body: SalesOrderQuoteConversionParams
  ) {
    const result = await unwrap(
      await convertQuoteToSalesOrderWorkflow(tenantId, quoteId, body)
    )
    return {
      resource: await resource(tenantId, result.id),
      replayed: result.replayed === true,
    }
  },

  async convertToInvoice(
    tenantId: string,
    salesOrderId: string,
    idempotency?: IdempotencyContext
  ) {
    const result = await unwrap(
      await convertSalesOrderToInvoiceWorkflow(
        tenantId,
        salesOrderId,
        idempotency
      )
    )
    return {
      resource: { object: 'invoice' as const, id: result.id },
      replayed: result.replayed === true,
    }
  },
}
