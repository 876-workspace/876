import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { vendorsController } from './vendors.controller'
import { vendorsDocs } from './vendors.docs'
import {
  vendorCreateBodySchema,
  vendorDeletedSchema,
  vendorListQuerySchema,
  vendorParamsSchema,
  vendorSchema,
  vendorUpdateBodySchema,
} from './vendors.schemas'

const legacyErrors = {
  422: { description: 'Validation Error', schema: errorEnvelopeSchema },
}

export function createVendorsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  const listSchema = z.object({
    object: z.literal('list'),
    data: z.array(vendorSchema),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })

  api.get({
    path: '/vendors',
    ...vendorsDocs.list,
    operationId: 'billing-billing_get_vendors',
    security: { kind: 'tenant', permission: 'vendors:read' },
    request: { query: vendorListQuerySchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listSchema),
      },
      ...legacyErrors,
    },
    handler: vendorsController.list,
  })
  api.post({
    path: '/vendors',
    ...vendorsDocs.create,
    operationId: 'billing-billing_post_vendors',
    security: { kind: 'tenant', permission: 'vendors:write' },
    request: { body: vendorCreateBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(vendorSchema),
      },
      ...legacyErrors,
    },
    handler: vendorsController.create,
  })
  api.get({
    path: '/vendors/:vendorId',
    ...vendorsDocs.retrieve,
    operationId: 'billing-billing_get_vendors_vendorId',
    security: { kind: 'tenant', permission: 'vendors:read' },
    request: { params: vendorParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(vendorSchema),
      },
      ...legacyErrors,
    },
    handler: vendorsController.retrieve,
  })
  api.patch({
    path: '/vendors/:vendorId',
    ...vendorsDocs.update,
    operationId: 'billing-billing_patch_vendors_vendorId',
    security: { kind: 'tenant', permission: 'vendors:write' },
    request: { params: vendorParamsSchema, body: vendorUpdateBodySchema },
    documentBody: false,
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(vendorSchema),
      },
      ...legacyErrors,
    },
    handler: vendorsController.update,
  })
  api.delete({
    path: '/vendors/:vendorId',
    ...vendorsDocs.del,
    operationId: 'billing-billing_delete_vendors_vendorId',
    security: { kind: 'tenant', permission: 'vendors:write' },
    request: { params: vendorParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(vendorDeletedSchema),
      },
      ...legacyErrors,
    },
    handler: vendorsController.del,
  })

  return api.router
}
