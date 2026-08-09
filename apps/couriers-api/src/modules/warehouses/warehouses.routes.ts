import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'
import * as controller from './warehouses.controller'
import {
  createWarehouseBodySchema,
  tenantIdParamsSchema,
  updateWarehouseBodySchema,
  warehouseParamsSchema,
  warehouseSchema,
} from './warehouses.schemas'

export function createWarehousesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Warehouses',
    prefix: '/v1/tenants/:tenantId/warehouses',
    resolveGuards,
  })
  api.get({
    path: '',
    security: 'admin',
    operationId: 'warehouses-list',
    summary: 'List a tenant’s warehouses',
    request: { params: tenantIdParamsSchema },
    responses: {
      200: {
        description: 'Warehouses returned.',
        schema: successEnvelopeSchema(listObjectSchema(warehouseSchema)),
      },
    },
    handler: controller.listWarehouses,
  })
  api.post({
    path: '',
    security: 'admin',
    operationId: 'warehouses-create',
    summary: 'Create a tenant warehouse',
    request: { params: tenantIdParamsSchema, body: createWarehouseBodySchema },
    responses: {
      201: {
        description: 'Warehouse created.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
      409: {
        description: 'Warehouse name conflict.',
        schema: errorEnvelopeSchema,
      },
      422: { description: 'Invalid input.', schema: errorEnvelopeSchema },
      503: {
        description: 'Geographic validation unavailable.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.createWarehouse,
  })
  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'warehouses-retrieve',
    summary: 'Retrieve a tenant warehouse',
    request: { params: warehouseParamsSchema },
    responses: {
      200: {
        description: 'Warehouse returned.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
      404: { description: 'Warehouse not found.', schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveWarehouse,
  })
  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'warehouses-update',
    summary: 'Update a tenant warehouse',
    request: { params: warehouseParamsSchema, body: updateWarehouseBodySchema },
    responses: {
      200: {
        description: 'Warehouse updated.',
        schema: successEnvelopeSchema(warehouseSchema),
      },
      404: { description: 'Warehouse not found.', schema: errorEnvelopeSchema },
      409: {
        description: 'Warehouse name conflict.',
        schema: errorEnvelopeSchema,
      },
      422: { description: 'Invalid input.', schema: errorEnvelopeSchema },
      503: {
        description: 'Geographic validation unavailable.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.updateWarehouse,
  })
  return api.router
}
