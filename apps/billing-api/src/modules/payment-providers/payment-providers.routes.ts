import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import { paymentProvidersController } from './payment-providers.controller'
import { paymentProvidersDocs } from './payment-providers.docs'
import {
  paymentProviderSchema,
  providerConnectionCreateBodySchema,
  providerConnectionParamsSchema,
  providerConnectionSchema,
  providerConnectionUpdateBodySchema,
} from './payment-providers.schemas'

const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
}

export function createPaymentProvidersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.get({
    path: '/payment-providers',
    ...paymentProvidersDocs.listCatalog,
    operationId: 'billing-billing_get_payment_providers',
    security: { kind: 'tenant', permission: 'payments:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(paymentProviderSchema)),
      },
      ...clientErrors,
    },
    handler: paymentProvidersController.listCatalog,
  })
  api.get({
    path: '/payment-providers/connections',
    ...paymentProvidersDocs.listConnections,
    operationId: 'billing-billing_get_payment_providers_connections',
    security: { kind: 'tenant', permission: 'payments:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          listObjectSchema(providerConnectionSchema)
        ),
      },
      ...clientErrors,
    },
    handler: paymentProvidersController.listConnections,
  })
  api.post({
    path: '/payment-providers/connections',
    ...paymentProvidersDocs.createConnection,
    operationId: 'billing-billing_post_payment_providers_connections',
    security: { kind: 'tenant', permission: 'payments:write' },
    request: { body: providerConnectionCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(providerConnectionSchema),
      },
      ...clientErrors,
    },
    handler: paymentProvidersController.createConnection,
  })
  api.patch({
    path: '/payment-providers/connections/:connectionId',
    ...paymentProvidersDocs.updateConnection,
    operationId:
      'billing-billing_patch_payment_providers_connections_connectionId',
    security: { kind: 'tenant', permission: 'payments:write' },
    request: {
      params: providerConnectionParamsSchema,
      body: providerConnectionUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(providerConnectionSchema),
      },
      ...clientErrors,
    },
    handler: paymentProvidersController.updateConnection,
  })
  return api.router
}
