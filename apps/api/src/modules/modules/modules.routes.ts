import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './modules.controller'
import * as docs from './modules.docs'
import {
  createModuleBodySchema,
  entitlementsQuerySchema,
  listModulesQuerySchema,
  moduleDeletedSchema,
  moduleIdParamsSchema,
  moduleSchema,
  updateModuleBodySchema,
} from './modules.schemas'

export function createModulesRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Modules',
    prefix: '/modules',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'modules-list_modules',
    summary: docs.LIST_MODULES_SUMMARY,
    description: docs.LIST_MODULES_DESCRIPTION,
    request: { query: listModulesQuerySchema },
    responses: {
      200: {
        description: 'Modules returned.',
        schema: listObjectSchema(moduleSchema),
      },
      404: { description: 'App not found.' },
    },
    handler: controller.listModules,
  })

  // Declared before '/:module_id' so 'entitlements' is not matched as an id.
  api.get({
    path: '/entitlements',
    operationId: 'modules-list_entitled_modules',
    summary: docs.EVALUATE_MODULES_SUMMARY,
    description: docs.EVALUATE_MODULES_DESCRIPTION,
    request: { query: entitlementsQuerySchema },
    responses: {
      200: {
        description: 'Entitled modules returned.',
        schema: listObjectSchema(moduleSchema),
      },
    },
    handler: controller.listEntitledModules,
  })

  api.post({
    path: '',
    operationId: 'modules-create_module',
    summary: docs.CREATE_MODULE_SUMMARY,
    description: docs.CREATE_MODULE_DESCRIPTION,
    request: { body: createModuleBodySchema },
    responses: {
      201: { description: 'Module created.', schema: moduleSchema },
      409: {
        description: 'Duplicate key, or the rollout flag is already in use.',
      },
      422: {
        description: 'The app or the rollout flag is not valid for a module.',
      },
    },
    handler: controller.createModule,
  })

  api.get({
    path: '/:module_id',
    operationId: 'modules-retrieve_module',
    summary: 'Retrieve an application module',
    request: { params: moduleIdParamsSchema },
    responses: {
      200: { description: 'Module returned.', schema: moduleSchema },
      404: { description: 'Application module not found.' },
    },
    handler: controller.retrieveModule,
  })

  api.patch({
    path: '/:module_id',
    operationId: 'modules-update_module',
    summary: docs.UPDATE_MODULE_SUMMARY,
    description: docs.UPDATE_MODULE_DESCRIPTION,
    request: { params: moduleIdParamsSchema, body: updateModuleBodySchema },
    responses: {
      200: { description: 'Module updated.', schema: moduleSchema },
      404: { description: 'Application module not found.' },
      409: {
        description: 'The rollout flag is already linked to another module.',
      },
      422: { description: 'The rollout flag is not valid for this module.' },
    },
    handler: controller.updateModule,
  })

  api.delete({
    path: '/:module_id',
    operationId: 'modules-archive_module',
    summary: 'Archive an application module',
    request: { params: moduleIdParamsSchema },
    responses: {
      200: { description: 'Module archived.', schema: moduleDeletedSchema },
      404: { description: 'Application module not found.' },
    },
    handler: controller.archiveModule,
  })

  return api.router
}
