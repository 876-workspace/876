import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import {
  SalesOrderCreateSchema,
  SalesOrderListQuerySchema,
  SalesOrderParamsSchema,
  SalesOrderQuoteConversionSchema,
  SalesOrderQuoteParamsSchema,
  SalesOrderUpdateSchema,
} from './schemas/sales-order'
import { salesOrdersController as controller } from './sales-orders.controller'
import {
  salesOrderResourceSchema,
  salesOrderSummaryResourceSchema,
} from './sales-orders.serializers'

const list = z.strictObject({
  object: z.literal('list'),
  data: z.array(salesOrderSummaryResourceSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
const invoiceCreated = z.strictObject({
  object: z.literal('invoice'),
  id: z.string().min(1),
})
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createSalesOrdersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Sales Orders', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales-orders:read' }
  const write = { kind: 'tenant' as const, permission: 'sales-orders:write' }

  api.get({
    path: '/sales-orders',
    summary: 'List Sales Orders',
    operationId: 'billing-billing_get_sales_orders',
    security: read,
    request: { query: SalesOrderListQuerySchema },
    responses: {
      200: {
        description: 'Sales Order list',
        schema: successEnvelopeSchema(list),
      },
      ...clientErrors,
    },
    handler: controller.list,
  })

  api.post({
    path: '/sales-orders',
    summary: 'Create a Sales Order',
    operationId: 'billing-billing_post_sales_orders',
    security: write,
    request: { body: SalesOrderCreateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Idempotent Sales Order replay',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      201: {
        description: 'Sales Order created',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })

  api.get({
    path: '/sales-orders/:salesOrderId',
    summary: 'Retrieve a Sales Order',
    operationId: 'billing-billing_get_sales_orders_salesOrderId',
    security: read,
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.get,
  })

  api.patch({
    path: '/sales-orders/:salesOrderId',
    summary: 'Update a draft Sales Order',
    operationId: 'billing-billing_patch_sales_orders_salesOrderId',
    security: write,
    request: { params: SalesOrderParamsSchema, body: SalesOrderUpdateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Sales Order updated',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.update,
  })

  for (const [action, handler] of [
    ['confirm', controller.confirm],
    ['cancel', controller.cancel],
    ['complete', controller.complete],
  ] as const) {
    api.post({
      path: `/sales-orders/:salesOrderId/${action}`,
      summary: `${action[0]!.toUpperCase()}${action.slice(1)} a Sales Order`,
      operationId: `billing-billing_post_sales_orders_salesOrderId_${action}`,
      security: write,
      request: { params: SalesOrderParamsSchema },
      responses: {
        200: {
          description: 'Sales Order updated',
          schema: successEnvelopeSchema(salesOrderResourceSchema),
        },
        ...clientErrors,
      },
      handler,
    })
  }

  api.post({
    path: '/quotes/:quoteId/convert-to-sales-order',
    summary: 'Convert an accepted quote to a Sales Order',
    operationId: 'billing-billing_post_quotes_quoteId_convert_to_sales_order',
    security: write,
    request: {
      params: SalesOrderQuoteParamsSchema,
      body: SalesOrderQuoteConversionSchema,
    },
    documentBody: false,
    responses: {
      200: {
        description: 'Idempotent Sales Order replay',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      201: {
        description: 'Sales Order created from quote',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...clientErrors,
    },
    handler: controller.convertQuote,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/convert-to-invoice',
    summary: 'Convert a confirmed Sales Order to an invoice',
    operationId: 'billing-billing_post_sales_orders_salesOrderId_convert_to_invoice',
    security: write,
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Idempotent invoice conversion replay',
        schema: successEnvelopeSchema(invoiceCreated),
      },
      201: {
        description: 'Invoice created from Sales Order',
        schema: successEnvelopeSchema(invoiceCreated),
      },
      ...clientErrors,
    },
    handler: controller.convertToInvoice,
  })

  return api.router
}
