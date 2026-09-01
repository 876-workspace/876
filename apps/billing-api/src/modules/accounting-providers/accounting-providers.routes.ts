import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import { accountingProvidersController as controller } from './accounting-providers.controller'
import { accountingProvidersDocs as docs } from './accounting-providers.docs'
import {
  accountingAuthorizationSchema,
  accountingConnectionCreateBodySchema,
  accountingConnectionDeletedSchema,
  accountingConnectionParamsSchema,
  accountingConnectionSchema,
  accountingConnectionUpdateBodySchema,
  accountingProviderSchema,
  accountingReconcileBodySchema,
  accountingReconcileSchema,
  organizationAccountingParamsSchema,
  zohoOauthCallbackQuerySchema,
} from './accounting-providers.schemas'

const clientErrors = {
  '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
  '5XX': { description: 'Provider Error', schema: errorEnvelopeSchema },
}

export function createAccountingProvidersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Accounting Providers', resolveGuards })

  api.get({
    path: '/admin/accounting-providers',
    ...docs.listProviders,
    security: { kind: 'admin' },
    responses: {
      200: {
        description: 'Accounting provider catalog',
        schema: successEnvelopeSchema(listObjectSchema(accountingProviderSchema)),
      },
      ...clientErrors,
    },
    handler: controller.listProviders,
  })

  api.get({
    path: '/admin/organizations/:organizationId/accounting-provider-connections',
    ...docs.listConnections,
    security: { kind: 'admin' },
    request: { params: organizationAccountingParamsSchema },
    responses: {
      200: {
        description: 'Accounting provider connections',
        schema: successEnvelopeSchema(listObjectSchema(accountingConnectionSchema)),
      },
      ...clientErrors,
    },
    handler: controller.listConnections,
  })

  api.post({
    path: '/admin/organizations/:organizationId/accounting-provider-connections',
    ...docs.createConnection,
    security: { kind: 'admin' },
    request: {
      params: organizationAccountingParamsSchema,
      body: accountingConnectionCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Accounting provider connection created',
        schema: successEnvelopeSchema(accountingConnectionSchema),
      },
      ...clientErrors,
    },
    handler: controller.createConnection,
  })

  api.get({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId',
    ...docs.retrieveConnection,
    security: { kind: 'admin' },
    request: { params: accountingConnectionParamsSchema },
    responses: {
      200: {
        description: 'Accounting provider connection',
        schema: successEnvelopeSchema(accountingConnectionSchema),
      },
      ...clientErrors,
    },
    handler: controller.retrieveConnection,
  })

  api.patch({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId',
    ...docs.updateConnection,
    security: { kind: 'admin' },
    request: {
      params: accountingConnectionParamsSchema,
      body: accountingConnectionUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Accounting provider connection updated',
        schema: successEnvelopeSchema(accountingConnectionSchema),
      },
      ...clientErrors,
    },
    handler: controller.updateConnection,
  })

  api.delete({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId',
    ...docs.deleteConnection,
    security: { kind: 'admin' },
    request: { params: accountingConnectionParamsSchema },
    responses: {
      200: {
        description: 'Accounting provider connection disabled',
        schema: successEnvelopeSchema(accountingConnectionDeletedSchema),
      },
      ...clientErrors,
    },
    handler: controller.deleteConnection,
  })

  api.post({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId/authorize',
    ...docs.authorize,
    security: { kind: 'admin' },
    request: { params: accountingConnectionParamsSchema },
    responses: {
      200: {
        description: 'Provider authorization URL',
        schema: successEnvelopeSchema(accountingAuthorizationSchema),
      },
      ...clientErrors,
    },
    handler: controller.authorize,
  })

  api.post({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId/validate',
    ...docs.validate,
    security: { kind: 'admin' },
    request: { params: accountingConnectionParamsSchema },
    responses: {
      200: {
        description: 'Validated accounting provider connection',
        schema: successEnvelopeSchema(accountingConnectionSchema),
      },
      ...clientErrors,
    },
    handler: controller.validate,
  })

  api.post({
    path: '/admin/organizations/:organizationId/accounting-provider-connections/:connectionId/reconcile',
    ...docs.reconcile,
    security: { kind: 'admin' },
    request: {
      params: accountingConnectionParamsSchema,
      body: accountingReconcileBodySchema,
    },
    responses: {
      200: {
        description: 'Accounting reconciliation queued',
        schema: successEnvelopeSchema(accountingReconcileSchema),
      },
      ...clientErrors,
    },
    handler: controller.reconcile,
  })

  api.get({
    path: '/providers/zoho-books/oauth/callback',
    ...docs.zohoCallback,
    security: { kind: 'public' },
    request: { query: zohoOauthCallbackQuerySchema },
    responses: {
      200: {
        description: 'Zoho Books authorization completed',
        schema: successEnvelopeSchema(accountingConnectionSchema),
      },
      ...clientErrors,
    },
    handler: controller.zohoCallback,
  })

  return api.router
}
