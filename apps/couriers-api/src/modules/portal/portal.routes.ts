import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import { customerEnrollmentSchema, customerSchema } from '@/modules/customers'
import { packageSchema, portalPackageSchema } from '@/modules/packages'

import * as controller from './portal.controller'
import {
  portalPackageParamsSchema,
  portalEnrollmentBodySchema,
  portalPackagesQuerySchema,
  portalShippingAddressSchema,
  portalTenantResolveQuerySchema,
  portalTenantSchema,
  portalTenantParamsSchema,
} from './portal.schemas'

export function createPortalRouter(resolveGuards: GuardResolver) {
  const root = createApiRouter({
    tag: 'Portal',
    prefix: '/v1/portal',
    resolveGuards,
  })
  root.get({
    path: '/tenants/resolve',
    security: 'apiKey',
    operationId: 'portal-tenants-resolve',
    summary: 'Resolve an active portal tenant by hostname or slug',
    request: { query: portalTenantResolveQuerySchema },
    responses: {
      200: {
        description: 'Active portal tenant returned.',
        schema: successEnvelopeSchema(portalTenantSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.resolvePortalTenant,
  })

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

  api.post({
    path: '/enrollments',
    security: 'session',
    operationId: 'portal-customer-enroll',
    summary: 'Atomically enroll the signed-in customer with a primary mailbox',
    request: {
      params: portalTenantParamsSchema,
      body: portalEnrollmentBodySchema,
    },
    responses: {
      201: {
        description: 'Customer portal enrollment completed.',
        schema: successEnvelopeSchema(customerEnrollmentSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
      409: {
        description: 'Customer enrollment conflict.',
        schema: errorEnvelopeSchema,
      },
      503: {
        description: 'Mailbox allocation unavailable.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.enrollPortalCustomer,
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
        schema: successEnvelopeSchema(portalPackageSchema),
      },
      404: { description: 'Package not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrievePortalPackage,
  })

  api.get({
    path: '/shipping-address',
    security: 'session',
    operationId: 'portal-shipping-address-retrieve',
    summary: 'Retrieve the signed-in customer shipping address view',
    request: { params: portalTenantParamsSchema },
    responses: {
      200: {
        description: 'Shipping address view returned.',
        schema: successEnvelopeSchema(portalShippingAddressSchema),
      },
      404: { description: 'Customer not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrievePortalShippingAddress,
  })

  return [root.router, api.router]
}
