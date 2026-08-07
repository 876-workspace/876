import type { Router } from 'express'
import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './memberships.controller'
import * as docs from './memberships.docs'
import {
  createMembershipBodySchema,
  listMembershipsQuerySchema,
  membershipIdParamsSchema,
  membershipSchema,
  updateMembershipBodySchema,
} from './memberships.schemas'

export function createMembershipsRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Memberships',
    prefix: '/memberships',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '',
    operationId: 'memberships-list_memberships',
    summary: docs.LIST_MEMBERSHIPS_SUMMARY,
    description: docs.LIST_MEMBERSHIPS_DESCRIPTION,
    request: { query: listMembershipsQuerySchema },
    responses: {
      200: {
        description: 'Memberships returned.',
        schema: listObjectSchema(membershipSchema),
      },
      401: docs.LIST_MEMBERSHIPS_RESPONSES[401],
      403: docs.LIST_MEMBERSHIPS_RESPONSES[403],
    },
    handler: controller.listMemberships,
  })

  api.post({
    path: '',
    operationId: 'memberships-create_membership',
    summary: docs.CREATE_MEMBERSHIP_SUMMARY,
    description: docs.CREATE_MEMBERSHIP_DESCRIPTION,
    request: { body: createMembershipBodySchema },
    responses: {
      201: { description: 'Membership created.', schema: membershipSchema },
      400: docs.CREATE_MEMBERSHIP_RESPONSES[400],
      401: docs.CREATE_MEMBERSHIP_RESPONSES[401],
      403: docs.CREATE_MEMBERSHIP_RESPONSES[403],
      404: docs.CREATE_MEMBERSHIP_RESPONSES[404],
      409: docs.CREATE_MEMBERSHIP_RESPONSES[409],
    },
    handler: controller.createMembership,
  })

  api.get({
    path: '/:membership_id',
    operationId: 'memberships-retrieve_membership',
    summary: docs.RETRIEVE_MEMBERSHIP_SUMMARY,
    description: docs.RETRIEVE_MEMBERSHIP_DESCRIPTION,
    request: { params: membershipIdParamsSchema },
    responses: {
      200: { description: 'Membership returned.', schema: membershipSchema },
      401: docs.RETRIEVE_MEMBERSHIP_RESPONSES[401],
      403: docs.RETRIEVE_MEMBERSHIP_RESPONSES[403],
      404: docs.RETRIEVE_MEMBERSHIP_RESPONSES[404],
    },
    handler: controller.retrieveMembership,
  })

  api.patch({
    path: '/:membership_id',
    operationId: 'memberships-update_membership',
    summary: docs.UPDATE_MEMBERSHIP_SUMMARY,
    description: docs.UPDATE_MEMBERSHIP_DESCRIPTION,
    request: {
      params: membershipIdParamsSchema,
      body: updateMembershipBodySchema,
    },
    responses: {
      200: { description: 'Membership updated.', schema: membershipSchema },
      401: docs.UPDATE_MEMBERSHIP_RESPONSES[401],
      403: docs.UPDATE_MEMBERSHIP_RESPONSES[403],
      404: docs.UPDATE_MEMBERSHIP_RESPONSES[404],
      409: docs.UPDATE_MEMBERSHIP_RESPONSES[409],
    },
    handler: controller.updateMembership,
  })

  api.delete({
    path: '/:membership_id',
    operationId: 'memberships-delete_membership',
    summary: docs.DELETE_MEMBERSHIP_SUMMARY,
    description: docs.DELETE_MEMBERSHIP_DESCRIPTION,
    request: { params: membershipIdParamsSchema },
    responses: {
      200: {
        description: 'Membership deleted.',
        schema: z.object({
          object: z.literal('membership'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      401: docs.DELETE_MEMBERSHIP_RESPONSES[401],
      403: docs.DELETE_MEMBERSHIP_RESPONSES[403],
      404: docs.DELETE_MEMBERSHIP_RESPONSES[404],
    },
    handler: controller.deleteMembership,
  })

  return api.router
}
