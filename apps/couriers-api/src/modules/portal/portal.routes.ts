import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import { customerSchema } from '@/modules/customers/customers.schemas'
import { packageSchema } from '@/modules/packages/packages.schemas'

import * as controller from './portal.controller'
import {
  portalPackageParamsSchema,
  portalPackagesQuerySchema,
  portalTenantParamsSchema,
} from './portal.schemas'

export function createPortalRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Portal',
    prefix: '/v1/portal/tenants/:tenantId',
    resolveGuards,
  })

  api.get({
    path: '/customer',
    security: 'session',
    operationId: 'portal-customer-retrieve',
    summary: 'Retrieve the signed-in customer portal profile',
    request: { params: portalTenantParamsSchema },
    responses: {
      200: {
        description: 'Customer profile returned.',
        schema: successEnvelopeSchema(customerSchema),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrievePortalCustomer,
  })

  api.get({
    path: '/packages',
    security: 'session',
    operationId: 'portal-packages-list',
    summary: 'List packages belonging to the signed-in customer',
    request: {
      params: portalTenantParamsSchema,
      query: portalPackagesQuerySchema,
    },
    responses: {
      200: {
        description: 'Customer packages returned.',
        schema: successEnvelopeSchema(listObjectSchema(packageSchema)),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.listPortalPackages,
  })

  api.get({
    path: '/packages/:id',
    security: 'session',
    operationId: 'portal-packages-retrieve',
    summary: 'Retrieve one package belonging to the signed-in customer',
    request: { params: portalPackageParamsSchema },
    responses: {
      200: {
        description: 'Customer package returned.',
        schema: successEnvelopeSchema(packageSchema),
      },
      404: { description: 'Package not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrievePortalPackage,
  })

  return api.router
}
