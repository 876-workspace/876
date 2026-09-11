import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { salesReceiptsController as controller } from './sales-receipts.controller'
import {
  IntegrationSalesReceiptCreateSchema,
  SalesReceiptCreateSchema,
  SalesReceiptQuoteConversionSchema,
  SalesReceiptRefundSchema,
  SalesReceiptVoidSchema,
} from './schemas/sales-receipt'

const id = z.strictObject({ salesReceiptId: z.string().min(1) })
const quoteId = z.strictObject({ quoteId: z.string().min(1) })
const org = z.strictObject({ organizationId: z.string().min(1) })
const orgReceipt = org.extend({ salesReceiptId: z.string().min(1) })
const orgQuote = org.extend({ quoteId: z.string().min(1) })
const status = z.enum(['PAID', 'VOID'])
const listQuery = z.strictObject({
  status: status.optional(),
  customerId: z.string().min(1).optional(),
})
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
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.sales-receipts.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.sales-receipts.write',
  }

  api.get({
    path: '/sales-receipts',
    summary: 'List Sales Receipts',
    operationId: 'billing-billing_get_sales_receipts',
    security: read,
    request: { query: listQuery },
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
    path: '/sales-receipts/:salesReceiptId/refund',
    summary: 'Refund a Sales Receipt',
    operationId: 'billing-billing_post_sales_receipts_salesReceiptId_refund',
    security: write,
    request: { params: id, body: SalesReceiptRefundSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt refunded',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.refund,
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

  api.post({
    path: '/quotes/:quoteId/convert-to-sales-receipt',
    summary: 'Convert an accepted quote to a Sales Receipt',
    operationId: 'billing-billing_post_quotes_quoteId_convert_to_sales_receipt',
    security: write,
    request: { params: quoteId, body: SalesReceiptQuoteConversionSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt created from quote',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.convertQuote,
  })

  const base = '/integrations/organizations/:organizationId/sales-receipts'

  api.get({
    path: base,
    summary: 'List organization Sales Receipts',
    operationId: 'billing-integration_get_sales_receipts',
    security: integrationRead,
    request: { params: org, query: listQuery },
    responses: {
      200: {
        description: 'Sales Receipt list',
        schema: successEnvelopeSchema(list),
      },
      ...clientErrors,
    },
    handler: controller.integrationList,
  })

  api.post({
    path: base,
    summary: 'Create an organization Sales Receipt',
    operationId: 'billing-integration_post_sales_receipts',
    security: integrationWrite,
    request: { params: org, body: IntegrationSalesReceiptCreateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Idempotent Sales Receipt replay',
        schema: successEnvelopeSchema(resource),
      },
      201: {
        description: 'Sales Receipt created',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.integrationCreate,
  })

  api.get({
    path: `${base}/:salesReceiptId`,
    summary: 'Retrieve an organization Sales Receipt',
    operationId: 'billing-integration_get_sales_receipts_salesReceiptId',
    security: integrationRead,
    request: { params: orgReceipt },
    responses: {
      200: {
        description: 'Sales Receipt',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.integrationGet,
  })

  api.post({
    path: `${base}/:salesReceiptId/refund`,
    summary: 'Refund an organization Sales Receipt',
    operationId: 'billing-integration_post_sales_receipts_salesReceiptId_refund',
    security: integrationWrite,
    request: { params: orgReceipt, body: SalesReceiptRefundSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt refunded',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.integrationRefund,
  })

  api.post({
    path: `${base}/:salesReceiptId/void`,
    summary: 'Void an organization Sales Receipt',
    operationId: 'billing-integration_post_sales_receipts_salesReceiptId_void',
    security: integrationWrite,
    request: { params: orgReceipt, body: SalesReceiptVoidSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Sales Receipt voided',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.integrationVoid,
  })

  api.post({
    path: '/integrations/organizations/:organizationId/quotes/:quoteId/convert-to-sales-receipt',
    summary: 'Convert an organization quote to a Sales Receipt',
    operationId: 'billing-integration_post_quotes_quoteId_convert_to_sales_receipt',
    security: integrationWrite,
    request: { params: orgQuote, body: SalesReceiptQuoteConversionSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Idempotent Sales Receipt replay',
        schema: successEnvelopeSchema(resource),
      },
      201: {
        description: 'Sales Receipt created from quote',
        schema: successEnvelopeSchema(resource),
      },
      ...clientErrors,
    },
    handler: controller.integrationConvertQuote,
  })

  return api.router
}
