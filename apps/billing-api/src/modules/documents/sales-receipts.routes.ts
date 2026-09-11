import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { salesReceiptsController as controller } from './sales-receipts.controller'
import {
  SalesReceiptCreateSchema,
  SalesReceiptVoidSchema,
} from './schemas/sales-receipt'

const id = z.strictObject({ salesReceiptId: z.string().min(1) })
const status = z.enum(['PAID', 'VOID'])
const resource = z
  .object({ object: z.literal('sales_receipt'), id: z.string() })
  .passthrough()
const list = z.strictObject({
  object: z.literal('list'),
  data: z.array(resource),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createSalesReceiptsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Sales Receipts', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }

  api.get({
    path: '/sales-receipts',
    summary: 'List Sales Receipts',
    operationId: 'billing-billing_get_sales_receipts',
    security: read,
    request: { query: z.strictObject({ status: status.optional() }) },
    responses: {
      200: {
        description: 'Sales Receipt list',
        schema: successEnvelopeSchema(list),
      },
      ...clientErrors,
    },
    handler: controller.list,
  })

  api.post({
    path: '/sales-receipts',
    summary: 'Create a Sales Receipt',
    operationId: 'billing-billing_post_sales_receipts',
    security: write,
    request: { body: SalesReceiptCreateSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt created',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })

  api.get({
    path: '/sales-receipts/:salesReceiptId',
    summary: 'Retrieve a Sales Receipt',
    operationId: 'billing-billing_get_sales_receipts_salesReceiptId',
    security: read,
    request: { params: id },
    responses: {
      200: {
        description: 'Sales Receipt',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.get,
  })

  api.post({
    path: '/sales-receipts/:salesReceiptId/void',
    summary: 'Void a Sales Receipt',
    operationId: 'billing-billing_post_sales_receipts_salesReceiptId_void',
    security: write,
    request: { params: id, body: SalesReceiptVoidSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt voided',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.void,
  })

  return api.router
}
