import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { accessController } from './access.controller'
import {
  memberAcknowledgementSchema,
  memberParamsSchema,
  memberUpdateBodySchema,
  roleAcknowledgementSchema,
  roleCreateBodySchema,
  roleDeletedSchema,
  roleParamsSchema,
  roleSchema,
  roleUpdateBodySchema,
} from './access.schemas'

const errors = {
  '4XX': { description: 'Client-safe error', schema: errorEnvelopeSchema },
}

export function createAccessRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Access', resolveGuards })
  api.get({
    path: '/roles',
    summary: 'List Billing roles',
    security: { kind: 'tenant', permission: 'roles:read' },
    responses: {
      200: {
        description: 'billing_role list',
        schema: successEnvelopeSchema(
          z.object({
            object: z.literal('list'),
            data: z.array(roleSchema),
            has_more: z.boolean(),
            total_count: z.number().int().nullable(),
            url: z.string(),
          })
        ),
      },
      ...errors,
    },
    handler: accessController.listRoles,
  })
  api.post({
    path: '/roles',
    summary: 'Create a custom Billing role',
    security: { kind: 'tenant', permission: 'roles:write' },
    request: { body: roleCreateBodySchema },
    responses: {
      201: {
        description: 'billing_role created',
        schema: successEnvelopeSchema(roleAcknowledgementSchema),
      },
      ...errors,
    },
    handler: accessController.createRole,
  })
  api.get({
    path: '/roles/:roleId',
    summary: 'Retrieve a Billing role',
    security: { kind: 'tenant', permission: 'roles:read' },
    request: { params: roleParamsSchema },
    responses: {
      200: {
        description: 'billing_role returned',
        schema: successEnvelopeSchema(roleSchema),
      },
      ...errors,
    },
    handler: accessController.retrieveRole,
  })
  api.patch({
    path: '/roles/:roleId',
    summary: 'Update a custom Billing role',
    security: { kind: 'tenant', permission: 'roles:write' },
    request: { params: roleParamsSchema, body: roleUpdateBodySchema },
    responses: {
      200: {
        description: 'billing_role returned',
        schema: successEnvelopeSchema(roleAcknowledgementSchema),
      },
      ...errors,
    },
    handler: accessController.updateRole,
  })
  api.delete({
    path: '/roles/:roleId',
    summary: 'Delete a custom Billing role',
    security: { kind: 'tenant', permission: 'roles:write' },
    request: { params: roleParamsSchema },
    responses: {
      200: {
        description: 'billing_role deleted',
        schema: successEnvelopeSchema(roleDeletedSchema),
      },
      ...errors,
    },
    handler: accessController.deleteRole,
  })
  api.patch({
    path: '/members/:userId',
    summary: 'Update a member Billing grant',
    security: { kind: 'tenant', permission: 'members:write' },
    request: { params: memberParamsSchema, body: memberUpdateBodySchema },
    responses: {
      200: {
        description: 'billing_member returned',
        schema: successEnvelopeSchema(memberAcknowledgementSchema),
      },
      ...errors,
    },
    handler: accessController.updateMember,
  })
  return api.router
}
