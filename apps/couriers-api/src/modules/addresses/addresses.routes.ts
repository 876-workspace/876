import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  deletedObjectSchema,
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import * as controller from './addresses.controller'
import * as docs from './addresses.docs'
import {
  addressCreateBodySchema,
  addressParamsSchema,
  addressSchema,
  addressUpdateBodySchema,
  listAddressesQuerySchema,
  tenantIdParamsSchema,
} from './addresses.schemas'

export function createAddressesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Addresses',
    prefix: '/v1/tenants/:tenantId/addresses',
    resolveGuards,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'addresses-list',
    summary: docs.LIST_SUMMARY,
    description: docs.LIST_DESCRIPTION,
    request: { params: tenantIdParamsSchema, query: listAddressesQuerySchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(listObjectSchema(addressSchema)),
      },
    },
    handler: controller.listAddresses,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'addresses-create',
    summary: docs.CREATE_SUMMARY,
    description: docs.CREATE_DESCRIPTION,
    request: { params: tenantIdParamsSchema, body: addressCreateBodySchema },
    responses: {
      201: {
        description: docs.RESPONSES[201].description,
        schema: successEnvelopeSchema(addressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.createAddress,
  })

  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'addresses-retrieve',
    summary: docs.RETRIEVE_SUMMARY,
    request: { params: addressParamsSchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(addressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveAddress,
  })

  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'addresses-update',
    summary: docs.UPDATE_SUMMARY,
    request: { params: addressParamsSchema, body: addressUpdateBodySchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(addressSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.updateAddress,
  })

  api.delete({
    path: '/:id',
    security: 'admin',
    operationId: 'addresses-delete',
    summary: docs.DELETE_SUMMARY,
    request: { params: addressParamsSchema },
    responses: {
      200: {
        description: 'Address deleted.',
        schema: successEnvelopeSchema(deletedObjectSchema('address')),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      409: { ...docs.RESPONSES[409], schema: errorEnvelopeSchema },
    },
    handler: controller.deleteAddress,
  })

  return api.router
}
