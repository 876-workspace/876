import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import * as controller from './organization-locations.controller'
import {
  organizationLocationReconciliationSchema,
  syncOrganizationLocationBodySchema,
  tenantIdParamsSchema,
} from './organization-locations.schemas'

export function createOrganizationLocationsRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Organization locations',
    prefix: '/v1/tenants/:tenantId/organization-locations',
    resolveGuards,
  })

  api.post({
    path: '/reconcile',
    security: 'admin',
    operationId: 'organization-locations-reconcile',
    summary: 'Reconcile unlinked Couriers sites with the organization registry',
    description:
      'Repairs a bounded, branch-first batch of Couriers sites whose core organization-location link is missing.',
    request: { params: tenantIdParamsSchema },
    responses: {
      200: {
        description: 'Reconciliation completed.',
        schema: successEnvelopeSchema(organizationLocationReconciliationSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.reconcileOrganizationLocations,
  })

  api.post({
    path: '/sync',
    security: 'admin',
    operationId: 'organization-locations-sync',
    summary: 'Synchronize one Couriers site with the organization registry',
    description:
      'Creates or updates the mirrored organization location for one branch or warehouse after it changes.',
    request: {
      params: tenantIdParamsSchema,
      body: syncOrganizationLocationBodySchema,
    },
    responses: {
      200: {
        description: 'Synchronization completed.',
        schema: successEnvelopeSchema(organizationLocationReconciliationSchema),
      },
      404: {
        description: 'Tenant or site not found.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.syncOrganizationLocation,
  })

  return api.router
}
