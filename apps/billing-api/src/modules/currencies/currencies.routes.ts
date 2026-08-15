import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { currenciesController } from './currencies.controller'
import { currenciesDocs } from './currencies.docs'
import {
  currencyDefaultBodySchema,
  currencyEnableBodySchema,
  currencyParamsSchema,
  currencySchema,
  currencyUpdateBodySchema,
  tenantCurrencyMutationSchema,
  tenantCurrencyCreatedSchema,
} from './currencies.schemas'

const errorResponse = {
  description: 'Client Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': errorResponse }
const legacyErrors = { 422: errorResponse }

export function createCurrenciesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  const mutationResponse = successEnvelopeSchema(tenantCurrencyMutationSchema)
  api.get({
    path: '/currencies',
    ...currenciesDocs.list,
    operationId: 'billing-billing_get_currencies',
    security: { kind: 'tenant', permission: 'currencies:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          z.object({
            object: z.literal('list'),
            data: z.array(currencySchema),
            has_more: z.boolean(),
            total_count: z.number().int().nullable(),
            url: z.string(),
          })
        ),
      },
      ...clientErrors,
    },
    handler: currenciesController.list,
  })
  api.post({
    path: '/currencies',
    ...currenciesDocs.create,
    operationId: 'billing-billing_post_currencies',
    security: { kind: 'tenant', permission: 'currencies:write' },
    request: { body: currencyEnableBodySchema },
    responses: {
      201: {
        description: 'tenant_currency created',
        schema: successEnvelopeSchema(tenantCurrencyCreatedSchema),
      },
      ...clientErrors,
    },
    handler: currenciesController.create,
  })
  api.patch({
    path: '/currencies',
    ...currenciesDocs.setDefault,
    operationId: 'billing-billing_patch_currencies',
    security: { kind: 'tenant', permission: 'currencies:write' },
    request: { body: currencyDefaultBodySchema },
    responses: {
      200: { description: 'Successful Response', schema: mutationResponse },
      ...clientErrors,
    },
    handler: currenciesController.setDefault,
  })
  api.patch({
    path: '/currencies/:code',
    ...currenciesDocs.update,
    operationId: 'billing-billing_patch_currencies_code',
    security: { kind: 'tenant', permission: 'currencies:write' },
    request: { params: currencyParamsSchema, body: currencyUpdateBodySchema },
    documentBody: false,
    responses: {
      200: { description: 'Successful Response', schema: mutationResponse },
      ...legacyErrors,
    },
    handler: currenciesController.update,
  })
  api.delete({
    path: '/currencies/:code',
    ...currenciesDocs.remove,
    operationId: 'billing-billing_delete_currencies_code',
    security: { kind: 'tenant', permission: 'currencies:write' },
    request: { params: currencyParamsSchema },
    responses: {
      200: { description: 'Successful Response', schema: mutationResponse },
      ...legacyErrors,
    },
    handler: currenciesController.remove,
  })
  return api.router
}
