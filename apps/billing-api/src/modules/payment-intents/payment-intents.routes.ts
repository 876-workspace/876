import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { paymentIntentsController as controller } from './payment-intents.controller'
import {
  paymentIntentCancelSchema,
  paymentIntentCreateSchema,
  paymentIntentListQuerySchema,
} from './schemas'
const org = z.strictObject({ organizationId: z.string().min(1) })
const intent = org.extend({ paymentIntentId: z.string().min(1) })
const resource = z
  .object({ object: z.literal('payment_intent'), id: z.string() })
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
export function createPaymentIntentsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Payment intents', resolveGuards })
  const read = { kind: 'tenant' as const, permission: 'payments:read' }
  const write = { kind: 'tenant' as const, permission: 'payments:write' }
  api.get({
    path: '/organizations/:organizationId/payment-intents',
    summary: 'List payment intents',
    security: read,
    request: { params: org, query: paymentIntentListQuerySchema },
    responses: {
      200: { description: 'OK', schema: successEnvelopeSchema(list) },
      ...errors,
    },
    handler: controller.list,
  })
  api.post({
    path: '/organizations/:organizationId/payment-intents',
    summary: 'Create a payment intent',
    security: write,
    request: { params: org, body: paymentIntentCreateSchema },
    responses: {
      201: { description: 'Created', schema: successEnvelopeSchema(resource) },
      ...errors,
    },
    handler: controller.create,
  })
  for (const [suffix, summary, handler, body] of [
    ['', 'Retrieve a payment intent', controller.get, undefined],
    ['/confirm', 'Confirm a payment intent', controller.confirm, undefined],
    ['/capture', 'Capture a payment intent', controller.capture, undefined],
    [
      '/cancel',
      'Cancel a payment intent',
      controller.cancel,
      paymentIntentCancelSchema,
    ],
  ] as const) {
    const method = suffix === '' ? 'get' : 'post'
    api[method]({
      path: `/organizations/:organizationId/payment-intents/:paymentIntentId${suffix}`,
      summary,
      security: suffix === '' ? read : write,
      request: body ? { params: intent, body } : { params: intent },
      responses: {
        200: { description: 'OK', schema: successEnvelopeSchema(resource) },
        ...errors,
      },
      handler,
    })
  }
  return api.router
}
