import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { recurringInvoicesController as controller } from './recurring-invoices.controller'
import {
  RecurringInvoiceCreateSchema,
  RecurringInvoiceListQuerySchema,
  RecurringInvoiceUpdateSchema,
} from './schemas/recurring-invoice'

const id = z.strictObject({ recurringInvoiceId: z.string().min(1) })
const org = z.strictObject({ organizationId: z.string().min(1) })
const orgId = org.extend({ recurringInvoiceId: z.string().min(1) })
const resource = z
  .object({ object: z.literal('recurring-invoice'), id: z.string() })
  .passthrough()
const list = z.strictObject({
  object: z.literal('list'),
  data: z.array(z.object({ object: z.string(), id: z.string() }).passthrough()),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
const errors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createRecurringInvoicesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Recurring Invoices', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'sales:read' }
  const write = { kind: 'tenant' as const, permission: 'sales:write' }
  const integrationRead = {
    kind: 'integration' as const,
    scope: 'billing.invoices.read',
  }
  const integrationWrite = {
    kind: 'integration' as const,
    scope: 'billing.invoices.write',
  }
  const response = {
    200: {
      description: 'Recurring Invoice',
      schema: successEnvelopeSchema(resource),
    },
    ...errors,
  }

  api.get({
    path: '/recurring-invoices',
    summary: 'List Recurring Invoices',
    operationId: 'billing-billing_get_recurring_invoices',
    security: read,
    request: { query: RecurringInvoiceListQuerySchema },
    responses: {
      200: {
        description: 'Recurring Invoice list',
        schema: successEnvelopeSchema(list),
      },
      ...errors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/recurring-invoices',
    summary: 'Create a Recurring Invoice',
    operationId: 'billing-billing_post_recurring_invoices',
    security: write,
    request: { body: RecurringInvoiceCreateSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Recurring Invoice',
        schema: successEnvelopeSchema(resource),
      },
      ...errors,
    },
    handler: controller.create,
  })
  api.get({
    path: '/recurring-invoices/:recurringInvoiceId',
    summary: 'Retrieve a Recurring Invoice',
    operationId: 'billing-billing_get_recurring_invoices_recurringInvoiceId',
    security: read,
    request: { params: id },
    responses: response,
    handler: controller.retrieve,
  })
  api.patch({
    path: '/recurring-invoices/:recurringInvoiceId',
    summary: 'Update a Recurring Invoice',
    operationId: 'billing-billing_patch_recurring_invoices_recurringInvoiceId',
    security: write,
    request: { params: id, body: RecurringInvoiceUpdateSchema },
    documentBody: false,
    responses: response,
    handler: controller.update,
  })
  api.delete({
    path: '/recurring-invoices/:recurringInvoiceId',
    summary: 'Delete a Recurring Invoice',
    operationId: 'billing-billing_delete_recurring_invoices_recurringInvoiceId',
    security: write,
    request: { params: id },
    responses: response,
    handler: controller.delete,
  })
  for (const [action, handler] of [
    ['pause', controller.pause],
    ['resume', controller.resume],
    ['stop', controller.stop],
  ] as const)
    api.post({
      path: `/recurring-invoices/:recurringInvoiceId/${action}`,
      summary: `${action} a Recurring Invoice`,
      operationId: `billing-billing_post_recurring_invoices_recurringInvoiceId_${action}`,
      security: write,
      request: { params: id, body: z.strictObject({}).default({}) },
      documentBody: false,
      responses: response,
      handler,
    })
  api.get({
    path: '/recurring-invoices/:recurringInvoiceId/invoices',
    summary: 'List generated invoices',
    operationId:
      'billing-billing_get_recurring_invoices_recurringInvoiceId_invoices',
    security: read,
    request: { params: id },
    responses: {
      200: { description: 'Invoice list', schema: successEnvelopeSchema(list) },
      ...errors,
    },
    handler: controller.children,
  })

  const base = '/integrations/organizations/:organizationId/recurring-invoices'
  api.get({
    path: base,
    summary: 'List organization Recurring Invoices',
    operationId: 'billing-integration_get_recurring_invoices',
    security: integrationRead,
    request: { params: org, query: RecurringInvoiceListQuerySchema },
    responses: {
      200: {
        description: 'Recurring Invoice list',
        schema: successEnvelopeSchema(list),
      },
      ...errors,
    },
    handler: controller.integrationList,
  })
  api.post({
    path: base,
    summary: 'Create an organization Recurring Invoice',
    operationId: 'billing-integration_post_recurring_invoices',
    security: integrationWrite,
    request: { params: org, body: RecurringInvoiceCreateSchema },
    documentBody: false,
    responses: {
      201: {
        description: 'Recurring Invoice',
        schema: successEnvelopeSchema(resource),
      },
      ...errors,
    },
    handler: controller.create,
  })
  api.get({
    path: `${base}/:recurringInvoiceId`,
    summary: 'Retrieve an organization Recurring Invoice',
    operationId:
      'billing-integration_get_recurring_invoices_recurringInvoiceId',
    security: integrationRead,
    request: { params: orgId },
    responses: response,
    handler: controller.retrieve,
  })
  api.patch({
    path: `${base}/:recurringInvoiceId`,
    summary: 'Update an organization Recurring Invoice',
    operationId:
      'billing-integration_patch_recurring_invoices_recurringInvoiceId',
    security: integrationWrite,
    request: { params: orgId, body: RecurringInvoiceUpdateSchema },
    documentBody: false,
    responses: response,
    handler: controller.update,
  })
  api.delete({
    path: `${base}/:recurringInvoiceId`,
    summary: 'Delete an organization Recurring Invoice',
    operationId:
      'billing-integration_delete_recurring_invoices_recurringInvoiceId',
    security: integrationWrite,
    request: { params: orgId },
    responses: response,
    handler: controller.delete,
  })
  for (const [action, handler] of [
    ['pause', controller.pause],
    ['resume', controller.resume],
    ['stop', controller.stop],
  ] as const)
    api.post({
      path: `${base}/:recurringInvoiceId/${action}`,
      summary: `${action} an organization Recurring Invoice`,
      operationId: `billing-integration_post_recurring_invoices_recurringInvoiceId_${action}`,
      security: integrationWrite,
      request: { params: orgId, body: z.strictObject({}).default({}) },
      documentBody: false,
      responses: response,
      handler,
    })
  api.get({
    path: `${base}/:recurringInvoiceId/invoices`,
    summary: 'List organization generated invoices',
    operationId:
      'billing-integration_get_recurring_invoices_recurringInvoiceId_invoices',
    security: integrationRead,
    request: { params: orgId },
    responses: {
      200: { description: 'Invoice list', schema: successEnvelopeSchema(list) },
      ...errors,
    },
    handler: controller.children,
  })
  return api.router
}
