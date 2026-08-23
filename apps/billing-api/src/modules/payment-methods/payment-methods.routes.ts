import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { paymentMethodsController as controller } from './payment-methods.controller'
import {
  paymentMethodCreateSchema,
  paymentMethodListQuerySchema,
  paymentMethodUpdateSchema,
} from './schemas'
const org = z.strictObject({ organizationId: z.string().min(1) })
const method = org.extend({ paymentMethodId: z.string().min(1) })
const customer = org.extend({ customerId: z.string().min(1) })
const resource = z
  .object({ object: z.literal('payment_method'), id: z.string() })
  .passthrough()
const list = z.strictObject({
  object: z.literal('list'),
  data: z.array(resource),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
const errors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}
export function createPaymentMethodsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Payment methods', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'payments:read' }
  const write = { kind: 'tenant' as const, permission: 'payments:write' }
  api.get({
    path: '/organizations/:organizationId/payment-methods',
    summary: 'List payment methods',
    security: read,
    request: { params: org, query: paymentMethodListQuerySchema },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(list) },
      ...errors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/organizations/:organizationId/payment-methods',
    summary: 'Create a payment method',
    security: write,
    request: { params: org, body: paymentMethodCreateSchema },
    responses: {
      201: { description: 'Created', schema: successEnvelopeSchema(resource) },
      ...errors,
    },
    handler: controller.create,
  })
  api.get({
    path: '/organizations/:organizationId/payment-methods/:paymentMethodId',
    summary: 'Retrieve a payment method',
    security: read,
    request: { params: method },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(resource) },
      ...errors,
    },
    handler: controller.get,
  })
  api.patch({
    path: '/organizations/:organizationId/payment-methods/:paymentMethodId',
    summary: 'Update a payment method',
    security: write,
    request: { params: method, body: paymentMethodUpdateSchema },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(resource) },
      ...errors,
    },
    handler: controller.update,
  })
  api.post({
    path: '/organizations/:organizationId/payment-methods/:paymentMethodId/default',
    summary: 'Set default payment method',
    security: write,
    request: { params: method },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(resource) },
      ...errors,
    },
    handler: controller.setDefault,
  })
  api.delete({
    path: '/organizations/:organizationId/payment-methods/:paymentMethodId',
    summary: 'Detach payment method',
    security: write,
    request: { params: method },
    responses: {
      200: {
        description: 'OK',
        schema: successEnvelopeSchema(
          z.strictObject({
            object: z.literal('payment_method'),
            id: z.string(),
            deleted: z.literal(true),
          })
        ),
      },
      ...errors,
    },
    handler: controller.detach,
  })
  api.get({
    path: '/organizations/:organizationId/customers/:customerId/payment-methods',
    summary: 'List customer payment methods',
    security: read,
    request: { params: customer, query: paymentMethodListQuerySchema },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(list) },
      ...errors,
    },
    handler: controller.customerList,
  })
  return api.router
}
