import { z } from 'zod'

import { attachPrincipal } from '@/http/auth'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './apps.controller'
import * as docs from './apps.docs'
import {
  createApiKeyBodySchema,
  apiKeyCreatedSchema,
  apiKeyDeleteSchema,
  apiKeyParamsSchema,
  apiKeySchema,
  updateApiKeyBodySchema,
  clientIdParamsSchema,
  appCreatedSchema,
  createAppBodySchema,
  appDeleteSchema,
  appIdParamsSchema,
  appPublicSchema,
  appSchema,
  updateAppBodySchema,
  listAppFeaturesQuerySchema,
  listAppsQuerySchema,
} from './apps.schemas'

// Public router — outside protected router, tier public (no api key needed)
// It exposes only GET /apps/public/{client_id}
export function createAppsPublicRouter(): ReturnType<
  typeof createApiRouter
>['router'] {
  const api = createApiRouter({
    tag: 'Apps',
    prefix: '/apps',
    security: 'public',
  })

  api.get({
    path: '/public/:client_id',
    operationId: 'apps-get_app_public',
    summary: docs.GET_APP_PUBLIC_SUMMARY,
    description: docs.GET_APP_PUBLIC_DESCRIPTION,
    request: { params: clientIdParamsSchema },
    responses: {
      200: { ...docs.GET_APP_PUBLIC_RESPONSES[200], schema: appPublicSchema },
      404: docs.GET_APP_PUBLIC_RESPONSES[404],
    },
    handler: controller.getAppPublic,
  })

  return api.router
}

export function createAppsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Apps',
    prefix: '/apps',
    security: 'apiKey',
    resolveGuards,
  })

  // List must check internal flag manually; declare apiKey and attachPrincipal
  api.get({
    path: '',
    operationId: 'apps-list_apps',
    summary: docs.LIST_APPS_SUMMARY,
    description: docs.LIST_APPS_DESCRIPTION,
    request: { query: listAppsQuerySchema },
    middleware: [attachPrincipal],
    responses: {
      200: {
        description: 'Apps returned.',
        schema: listObjectSchema(appSchema),
      },
      400: docs.LIST_APPS_RESPONSES[400],
    },
    handler: controller.listApps,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'apps-create_app_endpoint',
    summary: docs.CREATE_APP_SUMMARY,
    description: docs.CREATE_APP_DESCRIPTION,
    request: { body: createAppBodySchema },
    responses: {
      201: { description: 'App created.', schema: appCreatedSchema },
      400: docs.CREATE_APP_RESPONSES[400],
      401: docs.CREATE_APP_RESPONSES[401],
      403: docs.CREATE_APP_RESPONSES[403],
    },
    handler: controller.createApp,
  })

  // Sub-resource routes before /:app_id
  api.get({
    path: '/current',
    operationId: 'apps-retrieve_current_app',
    summary: docs.RETRIEVE_CURRENT_APP_SUMMARY,
    description: docs.RETRIEVE_CURRENT_APP_DESCRIPTION,
    responses: {
      200: { description: 'Current app returned.', schema: appSchema },
      404: docs.RETRIEVE_CURRENT_APP_RESPONSES[404],
    },
    handler: controller.getCurrentApp,
  })

  api.get({
    path: '/:app_id/features',
    security: 'admin',
    operationId: 'apps-list_app_features',
    summary: docs.LIST_APP_FEATURES_SUMMARY,
    description: docs.LIST_APP_FEATURES_DESCRIPTION,
    request: { params: appIdParamsSchema, query: listAppFeaturesQuerySchema },
    responses: {
      200: {
        description: 'Features returned.',
        schema: listObjectSchema(z.object({})),
      },
      404: docs.LIST_APP_FEATURES_RESPONSES[404],
    },
    handler: controller.listAppFeatures,
  })

  api.get({
    path: '/:app_id/subscriptions',
    security: 'admin',
    operationId: 'apps-list_app_subscriptions',
    summary: docs.LIST_APP_SUBSCRIPTIONS_SUMMARY,
    description: docs.LIST_APP_SUBSCRIPTIONS_DESCRIPTION,
    request: { params: appIdParamsSchema },
    responses: {
      200: {
        description: 'Subscriptions returned.',
        schema: z.array(z.object({})),
      },
      404: docs.LIST_APP_SUBSCRIPTIONS_RESPONSES[404],
    },
    handler: controller.listAppSubscriptions,
  })

  api.post({
    path: '/:app_id/api-keys',
    security: 'admin',
    operationId: 'apps-create_api_key',
    summary: docs.CREATE_API_KEY_SUMMARY,
    description: docs.CREATE_API_KEY_DESCRIPTION,
    request: { params: appIdParamsSchema, body: createApiKeyBodySchema },
    responses: {
      201: { description: 'API key created.', schema: apiKeyCreatedSchema },
      404: docs.CREATE_API_KEY_RESPONSES[404],
    },
    handler: controller.createApiKey,
  })

  api.get({
    path: '/:app_id/api-keys',
    security: 'admin',
    operationId: 'apps-list_api_keys',
    summary: docs.LIST_API_KEYS_SUMMARY,
    description: docs.LIST_API_KEYS_DESCRIPTION,
    request: {
      params: appIdParamsSchema,
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        starting_after: z.string().optional(),
        ending_before: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'API keys returned.',
        schema: listObjectSchema(apiKeySchema),
      },
      404: docs.LIST_API_KEYS_RESPONSES[404],
    },
    handler: controller.listApiKeys,
  })

  api.patch({
    path: '/:app_id/api-keys/:key_id',
    security: 'admin',
    operationId: 'apps-update_api_key',
    summary: docs.UPDATE_API_KEY_SUMMARY,
    description: docs.UPDATE_API_KEY_DESCRIPTION,
    request: { params: apiKeyParamsSchema, body: updateApiKeyBodySchema },
    responses: {
      200: { description: 'API key updated.', schema: apiKeySchema },
      404: docs.UPDATE_API_KEY_RESPONSES[404],
    },
    handler: controller.updateApiKey,
  })

  api.post({
    path: '/:app_id/api-keys/:key_id/revoke',
    security: 'admin',
    operationId: 'apps-revoke_api_key',
    summary: docs.REVOKE_API_KEY_SUMMARY,
    description: docs.REVOKE_API_KEY_DESCRIPTION,
    request: { params: apiKeyParamsSchema },
    responses: {
      200: { description: 'API key revoked.', schema: apiKeySchema },
      404: docs.REVOKE_API_KEY_RESPONSES[404],
    },
    handler: controller.revokeApiKey,
  })

  api.delete({
    path: '/:app_id/api-keys/:key_id',
    security: 'admin',
    operationId: 'apps-delete_api_key',
    summary: docs.DELETE_API_KEY_SUMMARY,
    description: docs.DELETE_API_KEY_DESCRIPTION,
    request: { params: apiKeyParamsSchema },
    responses: {
      200: { description: 'API key deleted.', schema: apiKeyDeleteSchema },
      404: docs.DELETE_API_KEY_RESPONSES[404],
    },
    handler: controller.deleteApiKey,
  })

  api.get({
    path: '/:app_id',
    operationId: 'apps-retrieve_app',
    summary: docs.RETRIEVE_APP_SUMMARY,
    description: docs.RETRIEVE_APP_DESCRIPTION,
    request: { params: appIdParamsSchema },
    responses: {
      200: { description: 'App returned.', schema: appSchema },
      404: docs.RETRIEVE_APP_RESPONSES[404],
    },
    handler: controller.getApp,
  })

  api.patch({
    path: '/:app_id',
    security: 'admin',
    operationId: 'apps-update_app',
    summary: docs.UPDATE_APP_SUMMARY,
    description: docs.UPDATE_APP_DESCRIPTION,
    request: { params: appIdParamsSchema, body: updateAppBodySchema },
    responses: {
      200: { description: 'App updated.', schema: appSchema },
      400: docs.UPDATE_APP_RESPONSES[400],
      404: docs.UPDATE_APP_RESPONSES[404],
    },
    handler: controller.updateApp,
  })

  api.delete({
    path: '/:app_id',
    security: 'admin',
    operationId: 'apps-delete_app',
    summary: docs.DELETE_APP_SUMMARY,
    description: docs.DELETE_APP_DESCRIPTION,
    request: { params: appIdParamsSchema },
    responses: {
      200: { description: 'App deleted.', schema: appDeleteSchema },
      404: docs.DELETE_APP_RESPONSES[404],
    },
    handler: controller.deleteApp,
  })

  return api.router
}
