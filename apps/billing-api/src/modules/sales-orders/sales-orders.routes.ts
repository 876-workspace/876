import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { salesOrdersController } from './sales-orders.controller'
import { salesOrdersDocs } from './sales-orders.docs'
import {
  salesOrderDeletedResourceSchema,
  salesOrderResourceSchema,
  salesOrderSummaryResourceSchema,
} from './sales-orders.resources'
import {
  SalesOrderCreateSchema,
  SalesOrderListQuerySchema,
  SalesOrderParamsSchema,
  SalesOrderUpdateSchema,
} from './sales-orders.schemas'

const validationError = {
  422: { description: 'Validation Error', schema: errorEnvelopeSchema },
}

const notFoundOrConflictErrors = {
  404: { description: 'Not Found', schema: errorEnvelopeSchema },
  409: { description: 'Invalid Sales Order State', schema: errorEnvelopeSchema },
  ...validationError,
}

export function createSalesOrdersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  const listSchema = z.strictObject({
    object: z.literal('list'),
    data: z.array(salesOrderSummaryResourceSchema),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })

  api.get({
    path: '/sales-orders',
    ...salesOrdersDocs.list,
    operationId: 'billing-sales-orders-list',
    security: { kind: 'tenant', permission: 'sales:read' },
    request: { query: SalesOrderListQuerySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema),
      },
      ...validationError,
    },
    handler: salesOrdersController.list,
  })

  api.post({
    path: '/sales-orders',
    ...salesOrdersDocs.create,
    operationId: 'billing-sales-orders-create',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { body: SalesOrderCreateSchema },
    responses: {
      201: {
        description: 'Sales Order Created',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      404: { description: 'Customer Not Found', schema: errorEnvelopeSchema },
      409: { description: 'Sales Order Conflict', schema: errorEnvelopeSchema },
      ...validationError,
    },
    handler: salesOrdersController.create,
  })

  api.get({
    path: '/sales-orders/:salesOrderId',
    ...salesOrdersDocs.retrieve,
    operationId: 'billing-sales-orders-retrieve',
    security: { kind: 'tenant', permission: 'sales:read' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      404: { description: 'Sales Order Not Found', schema: errorEnvelopeSchema },
      ...validationError,
    },
    handler: salesOrdersController.retrieve,
  })

  api.patch({
    path: '/sales-orders/:salesOrderId',
    ...salesOrdersDocs.update,
    operationId: 'billing-sales-orders-update',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: {
      params: SalesOrderParamsSchema,
      body: SalesOrderUpdateSchema,
    },
    responses: {
      200: {
        description: 'Sales Order Updated',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.update,
  })

  api.delete({
    path: '/sales-orders/:salesOrderId',
    ...salesOrdersDocs.del,
    operationId: 'billing-sales-orders-delete',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Deleted',
        schema: successEnvelopeSchema(salesOrderDeletedResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.del,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/submit',
    ...salesOrdersDocs.submit,
    operationId: 'billing-sales-orders-submit',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Submitted',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.submit,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/confirm',
    ...salesOrdersDocs.confirm,
    operationId: 'billing-sales-orders-confirm',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Confirmed',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.confirm,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/start-processing',
    ...salesOrdersDocs.startProcessing,
    operationId: 'billing-sales-orders-start-processing',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Processing Started',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.startProcessing,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/complete',
    ...salesOrdersDocs.complete,
    operationId: 'billing-sales-orders-complete',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Completed',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.complete,
  })

  api.post({
    path: '/sales-orders/:salesOrderId/cancel',
    ...salesOrdersDocs.cancel,
    operationId: 'billing-sales-orders-cancel',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { params: SalesOrderParamsSchema },
    responses: {
      200: {
        description: 'Sales Order Canceled',
        schema: successEnvelopeSchema(salesOrderResourceSchema),
      },
      ...notFoundOrConflictErrors,
    },
    handler: salesOrdersController.cancel,
  })

  return api.router
}
