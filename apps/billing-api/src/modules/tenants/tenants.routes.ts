import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { tenantsController } from './tenants.controller'
import {
  integrationOrganizationParamsSchema,
  integrationOrganizationSchema,
  tenantCreateBodySchema,
  tenantProvisionedSchema,
} from './tenants.schemas'

export function createTenantsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.post({
    path: '/tenants',
    summary: 'Billing POST /tenants',
    description: 'Ported from `src/app/api/billing/tenants/route.ts`.',
    operationId: 'billing-billing_post_tenants',
    security: { kind: 'organizationMember' },
    request: { body: tenantCreateBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(tenantProvisionedSchema),
      },
      422: { description: 'Validation Error', schema: errorEnvelopeSchema },
    },
    handler: tenantsController.provision,
  })
  return api.router
}

export function createIntegrationOrganizationRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Organization integrations',
    resolveGuards,
  })
  api.get({
    path: '/integrations/organizations/:organizationId',
    summary: 'Retrieve an organization Billing workspace',
    security: { kind: 'integration', scope: 'billing.organizations.read' },
    request: { params: integrationOrganizationParamsSchema },
    responses: {
      200: {
        description: 'billing_organization returned',
        schema: successEnvelopeSchema(integrationOrganizationSchema),
      },
      '4XX': { description: 'Client-safe error', schema: errorEnvelopeSchema },
    },
    handler: tenantsController.retrieveIntegration,
  })
  return api.router
}
