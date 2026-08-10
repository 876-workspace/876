import { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import * as controller from './tenants.controller'
import * as docs from './tenants.docs'
import {
  emptyQuerySchema,
  listTenantsQuerySchema,
  tenantIdParamsSchema,
  tenantOrgIdParamsSchema,
  tenantSchema,
} from './tenants.schemas'

export function createTenantsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Tenants',
    prefix: '/v1/tenants',
    resolveGuards,
  })

  // More specific static prefix before param route so /by-org/:orgId is not captured as /:id
  api.get({
    path: '/by-org/:orgId',
    security: 'apiKey',
    operationId: 'tenants-retrieve_by_org',
    summary: docs.RETRIEVE_TENANT_BY_ORG_SUMMARY,
    description: docs.RETRIEVE_TENANT_BY_ORG_DESCRIPTION,
    request: { params: tenantOrgIdParamsSchema, query: emptyQuerySchema },
    responses: {
      200: {
        description: docs.RETRIEVE_TENANT_BY_ORG_RESPONSES[200].description,
        schema: successEnvelopeSchema(tenantSchema),
      },
      404: {
        ...docs.RETRIEVE_TENANT_BY_ORG_RESPONSES[404],
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.retrieveTenantByOrgId,
  })

  const integration = createApiRouter({
    tag: 'Tenants',
    prefix: '/v1/integration/tenants',
    resolveGuards,
  })

  integration.get({
    path: '/by-org/:orgId',
    security: 'integration',
    operationId: 'integration-tenants-retrieve-by-org',
    summary: 'Retrieve a tenant by organization ID for an integration',
    description:
      'Returns the Couriers tenant for one 876 organization to an authenticated server-to-server integration.',
    request: { params: tenantOrgIdParamsSchema, query: emptyQuerySchema },
    responses: {
      200: {
        description: 'Tenant returned.',
        schema: successEnvelopeSchema(tenantSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveTenantByOrgId,
  })

  integration.get({
    path: '/:id',
    security: 'integration',
    operationId: 'integration-tenants-retrieve',
    summary: 'Retrieve a tenant for an integration',
    description:
      'Returns one explicitly addressed Couriers tenant to an authenticated server-to-server integration.',
    request: { params: tenantIdParamsSchema, query: emptyQuerySchema },
    responses: {
      200: {
        description: 'Tenant returned.',
        schema: successEnvelopeSchema(tenantSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveTenant,
  })

  api.get({
    path: '/:id',
    security: 'apiKey',
    operationId: 'tenants-retrieve',
    summary: docs.RETRIEVE_TENANT_SUMMARY,
    description: docs.RETRIEVE_TENANT_DESCRIPTION,
    request: { params: tenantIdParamsSchema, query: emptyQuerySchema },
    responses: {
      200: {
        description: docs.RETRIEVE_TENANT_RESPONSES[200].description,
        schema: successEnvelopeSchema(tenantSchema),
      },
      404: {
        ...docs.RETRIEVE_TENANT_RESPONSES[404],
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.retrieveTenant,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'tenants-list',
    summary: docs.LIST_TENANTS_SUMMARY,
    description: docs.LIST_TENANTS_DESCRIPTION,
    request: { query: listTenantsQuerySchema },
    responses: {
      200: {
        description: docs.LIST_TENANTS_RESPONSES[200].description,
        schema: successEnvelopeSchema(listObjectSchema(tenantSchema)),
      },
    },
    handler: controller.listTenants,
  })

  const root = Router()
  root.use(integration.router)
  root.use(api.router)
  return root
}
