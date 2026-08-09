import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import * as controller from './branches.controller'
import * as docs from './branches.docs'
import {
  branchParamsSchema,
  branchSchema,
  createBranchBodySchema,
  listBranchesQuerySchema,
  tenantIdParamsSchema,
  updateBranchBodySchema,
} from './branches.schemas'

export function createBranchesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Branches',
    prefix: '/v1/tenants/:tenantId/branches',
    resolveGuards,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'branches-list',
    summary: docs.LIST_SUMMARY,
    description: docs.LIST_DESCRIPTION,
    request: { params: tenantIdParamsSchema, query: listBranchesQuerySchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(listObjectSchema(branchSchema)),
      },
    },
    handler: controller.listBranches,
  })

  api.post({
    path: '',
    security: 'admin',
    operationId: 'branches-create',
    summary: docs.CREATE_SUMMARY,
    description: docs.CREATE_DESCRIPTION,
    request: { params: tenantIdParamsSchema, body: createBranchBodySchema },
    responses: {
      201: {
        description: docs.RESPONSES[201].description,
        schema: successEnvelopeSchema(branchSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      409: { ...docs.RESPONSES[409], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.createBranch,
  })

  api.get({
    path: '/:id',
    security: 'admin',
    operationId: 'branches-retrieve',
    summary: docs.RETRIEVE_SUMMARY,
    request: { params: branchParamsSchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(branchSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
    },
    handler: controller.retrieveBranch,
  })

  api.patch({
    path: '/:id',
    security: 'admin',
    operationId: 'branches-update',
    summary: docs.UPDATE_SUMMARY,
    request: { params: branchParamsSchema, body: updateBranchBodySchema },
    responses: {
      200: {
        description: docs.RESPONSES[200].description,
        schema: successEnvelopeSchema(branchSchema),
      },
      404: { ...docs.RESPONSES[404], schema: errorEnvelopeSchema },
      409: { ...docs.RESPONSES[409], schema: errorEnvelopeSchema },
      422: { ...docs.RESPONSES[422], schema: errorEnvelopeSchema },
      503: { ...docs.RESPONSES[503], schema: errorEnvelopeSchema },
    },
    handler: controller.updateBranch,
  })

  return api.router
}
