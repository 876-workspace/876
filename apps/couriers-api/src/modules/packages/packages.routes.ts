import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import * as controller from './packages.controller'
import {
  createPackageBodySchema,
  listPackagesQuerySchema,
  packageParamsSchema,
  packageSchema,
  tenantParamsSchema,
  updatePackageBodySchema,
} from './packages.schemas'
export function createPackagesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Packages',
    prefix: '/v1/tenants/:tenantId/packages',
    resolveGuards,
  })
  api.get({
    path: '',
    security: 'admin',
    operationId: 'packages-list',
    summary: 'List tenant packages',
    request: { params: tenantParamsSchema, query: listPackagesQuerySchema },
    responses: {
      200: {
        description: 'Packages returned.',
        schema: successEnvelopeSchema(listObjectSchema(packageSchema)),
      },
    },
    handler: controller.listPackages,
  })
  api.post({
    path: '',
    security: 'admin',
    operationId: 'packages-create',
    summary: 'Create a tenant package',
    request: { params: tenantParamsSchema, body: createPackageBodySchema },
    responses: {
      201: {
        description: 'Package created.',
        schema: successEnvelopeSchema(packageSchema),
      },
      404: {
        description: 'Referenced customer, branch, or mailbox not found.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.createPackage,
  })
  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'packages-retrieve',
    summary: 'Retrieve a tenant package',
    request: { params: packageParamsSchema },
    responses: {
      200: {
        description: 'Package returned.',
        schema: successEnvelopeSchema(packageSchema),
      },
      404: {
        description: 'Package not found.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.retrievePackage,
  })
  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'packages-update',
    summary: 'Update a tenant package',
    request: { params: packageParamsSchema, body: updatePackageBodySchema },
    responses: {
      200: {
        description: 'Package updated.',
        schema: successEnvelopeSchema(packageSchema),
      },
      404: {
        description: 'Package or referenced branch or mailbox not found.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.updatePackage,
  })
  return api.router
}
