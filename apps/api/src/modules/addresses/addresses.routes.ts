import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './addresses.controller'
import * as docs from './addresses.docs'
import {
  addressDeletedSchema,
  addressIdParamsSchema,
  addressSchema,
  createAddressBodySchema,
  listAddressesQuerySchema,
  updateAddressBodySchema,
} from './addresses.schemas'

export function createAddressesRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Addresses',
    prefix: '/addresses',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'addresses-list_addresses',
    summary: docs.LIST_ADDRESSES_SUMMARY,
    description: docs.LIST_ADDRESSES_DESCRIPTION,
    request: { query: listAddressesQuerySchema },
    responses: {
      200: {
        ...docs.LIST_ADDRESSES_RESPONSES[200],
        schema: listObjectSchema(addressSchema),
      },
      400: docs.LIST_ADDRESSES_RESPONSES[400],
    },
    handler: controller.listAddresses,
  })

  api.post({
    path: '',
    operationId: 'addresses-create_address',
    summary: docs.CREATE_ADDRESS_SUMMARY,
    description: docs.CREATE_ADDRESS_DESCRIPTION,
    request: { body: createAddressBodySchema },
    responses: {
      201: { ...docs.CREATE_ADDRESS_RESPONSES[201], schema: addressSchema },
      400: docs.CREATE_ADDRESS_RESPONSES[400],
    },
    handler: controller.createAddress,
  })

  api.get({
    path: '/:address_id',
    operationId: 'addresses-retrieve_address',
    summary: docs.RETRIEVE_ADDRESS_SUMMARY,
    description: docs.RETRIEVE_ADDRESS_DESCRIPTION,
    request: { params: addressIdParamsSchema },
    responses: {
      200: { ...docs.RETRIEVE_ADDRESS_RESPONSES[200], schema: addressSchema },
      404: docs.RETRIEVE_ADDRESS_RESPONSES[404],
    },
    handler: controller.retrieveAddress,
  })

  api.patch({
    path: '/:address_id',
    operationId: 'addresses-update_address',
    summary: docs.UPDATE_ADDRESS_SUMMARY,
    description: docs.UPDATE_ADDRESS_DESCRIPTION,
    request: { params: addressIdParamsSchema, body: updateAddressBodySchema },
    responses: {
      200: { ...docs.UPDATE_ADDRESS_RESPONSES[200], schema: addressSchema },
      // The FastAPI route returns this and never documented it; declaring it
      // here documents the real behaviour without editing the translated prose.
      400: { description: 'No fields to update.' },
      404: docs.UPDATE_ADDRESS_RESPONSES[404],
    },
    handler: controller.updateAddress,
  })

  api.delete({
    path: '/:address_id',
    operationId: 'addresses-delete_address',
    summary: docs.DELETE_ADDRESS_SUMMARY,
    description: docs.DELETE_ADDRESS_DESCRIPTION,
    request: { params: addressIdParamsSchema },
    responses: {
      200: {
        ...docs.DELETE_ADDRESS_RESPONSES[200],
        schema: addressDeletedSchema,
      },
      404: docs.DELETE_ADDRESS_RESPONSES[404],
    },
    handler: controller.deleteAddress,
  })

  return api.router
}
