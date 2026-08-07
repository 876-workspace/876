import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'
import * as docs from './users.docs'
import * as controller from './identifications.controller'
import {
  userIdentificationCreateBodySchema,
  userIdentificationUpdateBodySchema,
  userIdentificationDiscloseBodySchema,
  userIdentificationVerifyBodySchema,
} from './users.schemas'

const identificationSchema = z.object({
  object: z.literal('user_identification'),
  id: z.string(),
  user_id: z.string(),
  type: z.string(),
  label: z.string(),
  country_code: z.string().nullable(),
  value_masked: z.string(),
  verified: z.boolean(),
  verified_at: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export function registerIdentificationRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/:user_id/identifications',
    security: 'admin',
    operationId: 'users-list_user_identifications',
    summary: docs.LIST_USER_IDENTIFICATIONS_SUMMARY,
    description: docs.LIST_USER_IDENTIFICATIONS_DESCRIPTION,
    request: { params: z.strictObject({ user_id: z.string() }) },
    responses: {
      200: {
        description: 'Identifications.',
        schema: listObjectSchema(identificationSchema),
      },
      404: docs.LIST_USER_IDENTIFICATIONS_RESPONSES[404],
    },
    handler: controller.listUserIdentifications,
  })

  api.post({
    path: '/:user_id/identifications',
    security: 'admin',
    operationId: 'users-create_user_identification',
    summary: docs.CREATE_USER_IDENTIFICATION_SUMMARY,
    description: docs.CREATE_USER_IDENTIFICATION_DESCRIPTION,
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: userIdentificationCreateBodySchema,
    },
    responses: {
      201: { description: 'Created.', schema: identificationSchema },
      404: docs.CREATE_USER_IDENTIFICATION_RESPONSES[404],
      409: docs.CREATE_USER_IDENTIFICATION_RESPONSES[409],
    },
    handler: controller.createUserIdentification,
  })

  api.patch({
    path: '/:user_id/identifications/:type',
    security: 'admin',
    operationId: 'users-update_user_identification',
    summary: docs.UPDATE_USER_IDENTIFICATION_SUMMARY,
    description: docs.UPDATE_USER_IDENTIFICATION_DESCRIPTION,
    request: {
      params: z.strictObject({ user_id: z.string(), type: z.string() }),
      body: userIdentificationUpdateBodySchema,
    },
    responses: {
      200: { description: 'Updated.', schema: identificationSchema },
      404: docs.UPDATE_USER_IDENTIFICATION_RESPONSES[404],
    },
    handler: controller.updateUserIdentification,
  })

  api.delete({
    path: '/:user_id/identifications/:type',
    security: 'admin',
    operationId: 'users-delete_user_identification',
    summary: docs.DELETE_USER_IDENTIFICATION_SUMMARY,
    description: docs.DELETE_USER_IDENTIFICATION_DESCRIPTION,
    request: {
      params: z.strictObject({ user_id: z.string(), type: z.string() }),
    },
    responses: {
      200: {
        description: 'Deleted.',
        schema: z.object({
          object: z.literal('user_identification'),
          id: z.string(),
          deleted: z.literal(true),
        }),
      },
      404: docs.DELETE_USER_IDENTIFICATION_RESPONSES[404],
    },
    handler: controller.deleteUserIdentification,
  })

  api.post({
    path: '/:user_id/identifications/:type/disclose',
    security: 'admin',
    operationId: 'users-disclose_user_identification',
    summary: docs.DISCLOSE_USER_IDENTIFICATION_SUMMARY,
    description: docs.DISCLOSE_USER_IDENTIFICATION_DESCRIPTION,
    request: {
      params: z.strictObject({ user_id: z.string(), type: z.string() }),
      body: userIdentificationDiscloseBodySchema,
    },
    responses: {
      200: {
        description: 'Disclosed.',
        schema: z.object({
          object: z.literal('user_identification_disclosure'),
          type: z.string(),
          value: z.string(),
          country_code: z.string().nullable(),
          verified: z.boolean(),
          disclosed_at: z.number().int(),
        }),
      },
      403: docs.DISCLOSE_USER_IDENTIFICATION_RESPONSES[403],
      404: docs.DISCLOSE_USER_IDENTIFICATION_RESPONSES[404],
    },
    handler: controller.discloseUserIdentification,
  })

  api.post({
    path: '/:user_id/identifications/:type/verify',
    security: 'admin',
    operationId: 'users-verify_user_identification',
    summary: docs.VERIFY_USER_IDENTIFICATION_SUMMARY,
    description: docs.VERIFY_USER_IDENTIFICATION_DESCRIPTION,
    request: {
      params: z.strictObject({ user_id: z.string(), type: z.string() }),
      body: userIdentificationVerifyBodySchema,
    },
    responses: {
      200: { description: 'Verified.', schema: identificationSchema },
      404: docs.VERIFY_USER_IDENTIFICATION_RESPONSES[404],
    },
    handler: controller.verifyUserIdentification,
  })

  return api.router
}
