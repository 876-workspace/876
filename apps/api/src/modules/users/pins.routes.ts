import { z } from 'zod'
import { createApiRouter, type GuardResolver } from '@/http/api-router'
import * as controller from './pins.controller'
import { userPinSetBodySchema, userPinVerifyBodySchema } from './users.schemas'

export function registerPinRoutes(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'apiKey',
    resolveGuards,
  })

  api.get({
    path: '/:user_id/pin',
    security: 'admin',
    operationId: 'users-retrieve_user_pin',
    summary: 'Retrieve PIN status',
    description:
      'Returns whether a PIN is set and its lockout state. Never returns the PIN or its hash.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      query: z.strictObject({
        scope: z.string().optional().default('account'),
      }),
    },
    responses: {
      200: {
        description: 'PIN status.',
        schema: z.object({
          object: z.literal('pin'),
          user_id: z.string(),
          scope: z.string(),
          is_set: z.boolean(),
          set_at: z.number().int().nullable(),
          last_verified_at: z.number().int().nullable(),
          failed_attempts: z.number().int(),
          locked_until: z.number().int().nullable(),
        }),
      },
    },
    handler: controller.retrieveUserPin,
  })

  api.post({
    path: '/:user_id/pin',
    security: 'admin',
    operationId: 'users-set_user_pin',
    summary: 'Set or replace the account PIN',
    description:
      'Sets the account PIN, replacing any existing one and clearing its lockout.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: userPinSetBodySchema,
    },
    responses: {
      200: {
        description: 'PIN set.',
        schema: z.object({
          object: z.literal('pin'),
          user_id: z.string(),
          scope: z.string(),
          is_set: z.boolean(),
          set_at: z.number().int().nullable(),
          last_verified_at: z.number().int().nullable(),
          failed_attempts: z.number().int(),
          locked_until: z.number().int().nullable(),
        }),
      },
    },
    handler: controller.setUserPin,
  })

  api.post({
    path: '/:user_id/pin/verify',
    security: 'admin',
    operationId: 'users-verify_user_pin',
    summary: 'Verify the account PIN',
    description:
      'Checks a PIN. Five consecutive failures lock further checks for fifteen minutes.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      body: userPinVerifyBodySchema,
    },
    responses: {
      200: {
        description: 'Verification result.',
        schema: z.object({
          object: z.literal('pin_verification'),
          verified: z.boolean(),
          locked_until: z.number().int().nullable(),
        }),
      },
    },
    handler: controller.verifyUserPin,
  })

  api.delete({
    path: '/:user_id/pin',
    security: 'admin',
    operationId: 'users-delete_user_pin',
    summary: 'Clear the account PIN',
    description: 'Removes the account PIN.',
    request: {
      params: z.strictObject({ user_id: z.string() }),
      query: z.strictObject({
        scope: z.string().optional().default('account'),
      }),
    },
    responses: {
      200: {
        description: 'Cleared.',
        schema: z.object({
          object: z.literal('pin'),
          user_id: z.string(),
          deleted: z.literal(true),
        }),
      },
    },
    handler: controller.deleteUserPin,
  })

  return api.router
}
