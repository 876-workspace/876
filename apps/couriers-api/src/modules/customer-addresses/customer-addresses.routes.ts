import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  deletedObjectSchema,
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import * as controller from './customer-addresses.controller'
import * as docs from './customer-addresses.docs'
import {
  createCustomerAddressBodySchema,
  customerAddressParamsSchema,
  customerAddressSchema,
  listCustomerAddressesQuerySchema,
  tenantCustomerParamsSchema,
  updateCustomerAddressBodySchema,
} from './customer-addresses.schemas'

export function createCustomerAddressesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Customer addresses',
    prefix: '/v1/tenants/:tenantId/customers/:customerId/addresses',
    resolveGuards,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'customer-addresses-list',
    summary: docs.LIST_SUMMARY,
    description: docs.LIST_DESCRIPTION,
    request: {
      params: tenantCustomerParamsSchema,
      query: listCustomerAddressesQuerySchema,
    },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(listObjectSchema(customerAddressSchema)),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
    },
    handler: controller.listCustomerAddresses,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'customer-addresses-create',
    summary: docs.CREATE_SUMMARY,
    description: docs.CREATE_DESCRIPTION,
    request: {
      params: tenantCustomerParamsSchema,
      body: createCustomerAddressBodySchema,
    },
    responses: {
      201: {
        description: docs.RESPONSES[201].description,
        schema: successEnvelopeSchema(customerAddressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      409: { ...docs.RESPONSES[409], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.createCustomerAddress,
  })

  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'customer-addresses-retrieve',
    summary: docs.RETRIEVE_SUMMARY,
    request: { params: customerAddressParamsSchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(customerAddressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveCustomerAddress,
  })

  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'customer-addresses-update',
    summary: docs.UPDATE_SUMMARY,
    request: {
      params: customerAddressParamsSchema,
      body: updateCustomerAddressBodySchema,
    },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(customerAddressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      409: { ...docs.RESPONSES[409], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.updateCustomerAddress,
  })

  api.delete({
    path: '/:id',
    security: 'admin',
    operationId: 'customer-addresses-delete',
    summary: docs.DELETE_SUMMARY,
    request: { params: customerAddressParamsSchema },
    responses: {
      200: {
        description: 'Customer address deleted.',
        schema: successEnvelopeSchema(deletedObjectSchema('customer_address')),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
    },
    handler: controller.deleteCustomerAddress,
  })

  return api.router
}
