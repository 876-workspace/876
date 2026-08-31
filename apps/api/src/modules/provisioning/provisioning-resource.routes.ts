import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './provisioning-resource.controller'
import {
  deletedProvisioningSetupResourceResponseSchema,
  provisioningResourceResponseSchema,
  provisioningSetupResourceCreateSchema,
  provisioningSetupResourceItemParamsSchema,
  provisioningSetupResourceParamsSchema,
  provisioningSetupResourceUpdateSchema,
} from './provisioning-resource.schemas'

export function createProvisioningResourceRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Provisioning',
    prefix: '/provisioning',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '/setups/:setup_key/resources/:resource_type',
    operationId: 'provisioning-list_setup_resources',
    summary: 'List provisioning setup resources',
    description:
      'Lists the effective draft resources for one registered finance provisioning resource type. Published data is used when no draft exists.',
    request: { params: provisioningSetupResourceParamsSchema },
    responses: {
      200: {
        description: 'Provisioning resources returned.',
        schema: listObjectSchema(provisioningResourceResponseSchema),
      },
      404: { description: 'Setup or resource type not found.' },
    },
    handler: controller.listSetupResources,
  })

  api.post({
    path: '/setups/:setup_key/resources/:resource_type',
    operationId: 'provisioning-create_setup_resource',
    summary: 'Create provisioning setup resource',
    description:
      'Creates one resource in the setup draft while preserving every other manifest resource and step.',
    request: {
      params: provisioningSetupResourceParamsSchema,
      body: provisioningSetupResourceCreateSchema,
    },
    responses: {
      201: {
        description: 'Provisioning resource created.',
        schema: provisioningResourceResponseSchema,
      },
      404: { description: 'Setup or resource type not found.' },
      409: { description: 'Resource key, position, or cardinality conflict.' },
      422: { description: 'Resource does not match the provisioning catalog.' },
    },
    handler: controller.createSetupResource,
  })

  api.get({
    path: '/setups/:setup_key/resources/:resource_type/:resource_key',
    operationId: 'provisioning-retrieve_setup_resource',
    summary: 'Retrieve provisioning setup resource',
    description:
      'Retrieves one effective resource by its stable resource type and key.',
    request: { params: provisioningSetupResourceItemParamsSchema },
    responses: {
      200: {
        description: 'Provisioning resource returned.',
        schema: provisioningResourceResponseSchema,
      },
      404: { description: 'Setup, resource type, or resource not found.' },
    },
    handler: controller.retrieveSetupResource,
  })

  api.patch({
    path: '/setups/:setup_key/resources/:resource_type/:resource_key',
    operationId: 'provisioning-update_setup_resource',
    summary: 'Update provisioning setup resource',
    description:
      'Updates one draft resource without requiring the caller to replace the complete provisioning manifest.',
    request: {
      params: provisioningSetupResourceItemParamsSchema,
      body: provisioningSetupResourceUpdateSchema,
    },
    responses: {
      200: {
        description: 'Provisioning resource updated.',
        schema: provisioningResourceResponseSchema,
      },
      404: { description: 'Setup, resource type, or resource not found.' },
      409: { description: 'Resource position conflict.' },
      422: { description: 'Resource does not match the provisioning catalog.' },
    },
    handler: controller.updateSetupResource,
  })

  api.delete({
    path: '/setups/:setup_key/resources/:resource_type/:resource_key',
    operationId: 'provisioning-delete_setup_resource',
    summary: 'Delete provisioning setup resource',
    description:
      'Deletes one draft resource when doing so preserves the catalog minimum and does not break another resource reference.',
    request: { params: provisioningSetupResourceItemParamsSchema },
    responses: {
      200: {
        description: 'Provisioning resource deleted.',
        schema: deletedProvisioningSetupResourceResponseSchema,
      },
      404: { description: 'Setup, resource type, or resource not found.' },
      409: { description: 'Resource is required or referenced by another resource.' },
    },
    handler: controller.deleteSetupResource,
  })

  return api.router
}
