import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { paymentsController as controller } from './payments.controller'
import {
  PaymentApplySchema,
  PaymentCreateSchema,
  IntegrationPaymentCreateSchema,
  PaymentModeCreateSchema,
  PaymentModeUpdateSchema,
  PaymentUpdateSchema,
} from './schemas/payment'
import { RefundCreateSchema } from './schemas/refund'

const id = (name: string) => z.strictObject({ [name]: z.string().min(1) })
const org = z.strictObject({ organizationId: z.string().min(1) })
const orgPayment = org.extend({ paymentId: z.string().min(1) })
const resource = (name: string) =>
  z.object({ object: z.literal(name), id: z.string() }).passthrough()
const deleted = (name: string) =>
  z.strictObject({
    object: z.literal(name),
    id: z.string(),
    deleted: z.literal(true),
  })
const list = (name: string) =>
  z.strictObject({
    object: z.literal('list'),
    data: z.array(resource(name)),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
const errorResponse = {
  description: 'Client Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': errorResponse }
const legacyErrors = { 422: errorResponse }
export function createPaymentsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Payments', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'payments:read' }
  const write = { kind: 'tenant' as const, permission: 'payments:write' }
  api.get({
    path: '/payments/modes',
    summary: 'List payment modes',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesList,
  })
  api.post({
    path: '/payments/modes',
    summary: 'Create a payment mode',
    security: write,
    request: { body: PaymentModeCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesCreate,
  })
  api.get({
    path: '/payments/modes/:modeId',
    summary: 'Retrieve a payment mode',
    security: read,
    request: { params: id('modeId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesGet,
  })
  api.patch({
    path: '/payments/modes/:modeId',
    summary: 'Update a payment mode',
    security: write,
    request: { params: id('modeId'), body: PaymentModeUpdateSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesUpdate,
  })
  api.delete({
    path: '/payments/modes/:modeId',
    summary: 'Delete a payment mode',
    security: write,
    request: { params: id('modeId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deleted('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesDelete,
  })
  api.get({
    path: '/payments',
    summary: 'List payments',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('payment')),
      },
      ...clientErrors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/payments',
    summary: 'Create a payment',
    security: write,
    request: { body: PaymentCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.create,
  })
  api.get({
    path: '/payments/:paymentId',
    summary: 'Retrieve a payment',
    security: read,
    request: { params: id('paymentId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.get,
  })
  api.patch({
    path: '/payments/:paymentId',
    summary: 'Update a payment',
    security: write,
    request: { params: id('paymentId'), body: PaymentUpdateSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.update,
  })
  api.delete({
    path: '/payments/:paymentId',
    summary: 'Cancel a payment',
    security: write,
    request: { params: id('paymentId') },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deleted('payment')),
      },
      ...clientErrors,
    },
    handler: controller.del,
  })
  api.post({
    path: '/payments/:paymentId/apply',
    summary: 'Apply a payment',
    security: write,
    request: { params: id('paymentId'), body: PaymentApplySchema },
    responses: {
      201: {
        description: 'Payment applied',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.apply,
  })
  api.get({
    path: '/refunds',
    summary: 'List refunds',
    security: read,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(list('refund')),
      },
      ...legacyErrors,
    },
    handler: controller.refundsList,
  })
  api.post({
    path: '/refunds',
    summary: 'Create a refund',
    security: write,
    request: { body: RefundCreateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(resource('refund')),
      },
      ...legacyErrors,
    },
    handler: controller.refundsCreate,
  })
  const base = '/integrations/organizations/:organizationId/payments'
  api.get({
    path: base,
    summary: 'List organization Billing payments',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: org },
    responses: {
      200: {
        description: 'Payment list',
        schema: successEnvelopeSchema(list('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationList,
  })
  api.post({
    path: base,
    summary: 'Create an organization Billing payment',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: org, body: IntegrationPaymentCreateSchema },
    responses: {
      200: {
        description: 'Payment replayed',
        schema: successEnvelopeSchema(resource('payment')),
      },
      201: {
        description: 'Payment created',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationCreate,
  })
  api.get({
    path: `${base}/:paymentId`,
    summary: 'Retrieve an organization Billing payment',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: orgPayment },
    responses: {
      200: {
        description: 'Payment returned',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationGet,
  })
  api.patch({
    path: `${base}/:paymentId`,
    summary: 'Update an organization Billing payment',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: orgPayment, body: PaymentUpdateSchema },
    responses: {
      200: {
        description: 'Payment updated',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationUpdate,
  })
  api.delete({
    path: `${base}/:paymentId`,
    summary: 'Cancel an organization Billing payment',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: orgPayment },
    responses: {
      200: {
        description: 'Payment canceled',
        schema: successEnvelopeSchema(deleted('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationDel,
  })
  api.post({
    path: `${base}/:paymentId/apply`,
    summary: 'Apply an organization Billing payment',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: orgPayment, body: PaymentApplySchema },
    responses: {
      201: {
        description: 'Payment applied',
        schema: successEnvelopeSchema(resource('payment')),
      },
      ...clientErrors,
    },
    handler: controller.integrationApply,
  })
  const refundsBase = '/integrations/organizations/:organizationId/refunds'
  api.get({
    path: refundsBase,
    summary: 'List organization Billing refunds',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: org },
    responses: {
      200: {
        description: 'Refund list',
        schema: successEnvelopeSchema(list('refund')),
      },
      ...clientErrors,
    },
    handler: controller.refundsIntegrationList,
  })
  api.post({
    path: refundsBase,
    summary: 'Create an organization Billing refund',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: org, body: RefundCreateSchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Refund created',
        schema: successEnvelopeSchema(resource('refund')),
      },
      ...clientErrors,
    },
    handler: controller.refundsIntegrationCreate,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/payment-modes',
    summary: 'List organization Billing payment modes',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: org },
    responses: {
      200: {
        description: 'Payment-mode list',
        schema: successEnvelopeSchema(list('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesIntegrationList,
  })
  const modesBase = '/integrations/organizations/:organizationId/payment-modes'
  const orgMode = org.extend({ modeId: z.string().min(1) })
  api.post({
    path: modesBase,
    summary: 'Create an organization Billing payment mode',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: org, body: PaymentModeCreateSchema },
    responses: {
      201: {
        description: 'Created',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesCreate,
  })
  api.get({
    path: `${modesBase}/:modeId`,
    summary: 'Retrieve an organization Billing payment mode',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: orgMode },
    responses: {
      200: {
        description: 'Returned',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesGet,
  })
  api.patch({
    path: `${modesBase}/:modeId`,
    summary: 'Update an organization Billing payment mode',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: orgMode, body: PaymentModeUpdateSchema },
    responses: {
      200: {
        description: 'Updated',
        schema: successEnvelopeSchema(resource('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesUpdate,
  })
  api.delete({
    path: `${modesBase}/:modeId`,
    summary: 'Delete an organization Billing payment mode',
    security: { kind: 'integration', scope: 'billing.payments.write' },
    request: { params: orgMode },
    responses: {
      200: {
        description: 'Deleted',
        schema: successEnvelopeSchema(deleted('payment_mode')),
      },
      ...clientErrors,
    },
    handler: controller.modesDelete,
  })
  return api.router
}
