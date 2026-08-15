import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { commercialController } from './commercial.controller'
import { commercialDocs } from './commercial.docs'
import {
  paymentTermCreateBodySchema,
  paymentTermSchema,
  salespersonCreateBodySchema,
  salespersonSchema,
} from './commercial.schemas'

function listSchema<T extends z.ZodType>(item: T) {
  return z.object({
    object: z.literal('list'),
    data: z.array(item),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
}
const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createCommercialRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.get({
    path: '/payment-terms',
    ...commercialDocs.listPaymentTerms,
    operationId: 'billing-billing_get_payment_terms',
    security: { kind: 'tenant', permission: 'sales:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(paymentTermSchema)),
      },
      ...clientErrors,
    },
    handler: commercialController.listPaymentTerms,
  })
  api.post({
    path: '/payment-terms',
    ...commercialDocs.createPaymentTerm,
    operationId: 'billing-billing_post_payment_terms',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { body: paymentTermCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(paymentTermSchema),
      },
      ...clientErrors,
    },
    handler: commercialController.createPaymentTerm,
  })
  api.get({
    path: '/salespeople',
    ...commercialDocs.listSalespeople,
    operationId: 'billing-billing_get_salespeople',
    security: { kind: 'tenant', permission: 'sales:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema(salespersonSchema)),
      },
      ...clientErrors,
    },
    handler: commercialController.listSalespeople,
  })
  api.post({
    path: '/salespeople',
    ...commercialDocs.createSalesperson,
    operationId: 'billing-billing_post_salespeople',
    security: { kind: 'tenant', permission: 'sales:write' },
    request: { body: salespersonCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(salespersonSchema),
      },
      ...clientErrors,
    },
    handler: commercialController.createSalesperson,
  })

  return api.router
}
