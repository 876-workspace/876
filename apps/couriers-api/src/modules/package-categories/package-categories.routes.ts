import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  deletedObjectSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import {
  createPackageCategory,
  deletePackageCategory,
  listPackageCategories,
  reconcilePackageCategories,
  retrievePackageCategory,
  updatePackageCategory,
} from './package-categories.controller'
import {
  createPackageCategoryBodySchema,
  listPackageCategoriesQuerySchema,
  packageCategoryParamsSchema,
  packageCategoryReconciliationSchema,
  packageCategorySchema,
  reconcilePackageCategoriesBodySchema,
  tenantParamsSchema,
  updatePackageCategoryBodySchema,
} from './package-categories.schemas'

export function createPackageCategoriesRouter(resolveGuards: GuardResolver) {
  return createApiRouter({
    tag: 'Package categories',
    prefix: '/v1/tenants/:tenantId/package-categories',
    security: 'admin',
    resolveGuards,
  })
    .get({
      path: '',
      summary: 'List package categories',
      operationId: 'listPackageCategories',
      request: {
        params: tenantParamsSchema,
        query: listPackageCategoriesQuerySchema,
      },
      responses: {
        200: {
          description: 'Package categories.',
          schema: successEnvelopeSchema(listObjectSchema(packageCategorySchema)),
        },
      },
      handler: listPackageCategories,
    })
    .post({
      path: '',
      summary: 'Create package category',
      operationId: 'createPackageCategory',
      request: {
        params: tenantParamsSchema,
        body: createPackageCategoryBodySchema,
      },
      responses: {
        201: {
          description: 'Package category created.',
          schema: successEnvelopeSchema(packageCategorySchema),
        },
      },
      handler: createPackageCategory,
    })
    .post({
      path: '/reconcile',
      summary: 'Reconcile provisioned package categories',
      operationId: 'reconcilePackageCategories',
      request: {
        params: tenantParamsSchema,
        body: reconcilePackageCategoriesBodySchema,
      },
      responses: {
        200: {
          description: 'Provisioned package categories reconciled.',
          schema: successEnvelopeSchema(packageCategoryReconciliationSchema),
        },
      },
      handler: reconcilePackageCategories,
    })
    .get({
      path: '/:id',
      summary: 'Retrieve package category',
      operationId: 'retrievePackageCategory',
      request: { params: packageCategoryParamsSchema },
      responses: {
        200: {
          description: 'Package category.',
          schema: successEnvelopeSchema(packageCategorySchema),
        },
      },
      handler: retrievePackageCategory,
    })
    .patch({
      path: '/:id',
      summary: 'Update package category',
      operationId: 'updatePackageCategory',
      request: {
        params: packageCategoryParamsSchema,
        body: updatePackageCategoryBodySchema,
      },
      responses: {
        200: {
          description: 'Package category updated.',
          schema: successEnvelopeSchema(packageCategorySchema),
        },
      },
      handler: updatePackageCategory,
    })
    .delete({
      path: '/:id',
      summary: 'Archive package category',
      operationId: 'deletePackageCategory',
      request: { params: packageCategoryParamsSchema },
      responses: {
        200: {
          description: 'Package category archived.',
          schema: successEnvelopeSchema(deletedObjectSchema('package_category')),
        },
      },
      handler: deletePackageCategory,
    }).router
}
