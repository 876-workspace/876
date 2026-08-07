import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './auth-attempts.controller'
import * as docs from './auth-attempts.docs'
import {
  attemptIdParamsSchema,
  authAttemptSchema,
  authAttemptSummarySchema,
  listAuthAttemptsQuerySchema,
  summaryQuerySchema,
  userIdParamsSchema,
} from './auth-attempts.schemas'

/**
 * The attempt history is admin-only: it holds identifiers, IP addresses, and
 * device fingerprints for failed logins, which is exactly the material an
 * attacker would want and no app-tier caller needs.
 */
export function createAuthAttemptsRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Auth Attempts',
    prefix: '/auth-attempts',
    security: 'admin',
    resolveGuards,
  })

  // Declared before '/:attempt_id', or Express would match 'summary' as an id.
  api.get({
    path: '/summary',
    operationId: 'auth-attempts-retrieve_auth_attempt_summary',
    summary: docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY_SUMMARY,
    description: docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY_DESCRIPTION,
    request: { query: summaryQuerySchema },
    responses: {
      200: {
        description: 'Summary returned.',
        schema: authAttemptSummarySchema,
      },
    },
    handler: controller.retrieveSummary,
  })

  api.get({
    path: '',
    operationId: 'auth-attempts-list_auth_attempts',
    summary: docs.LIST_AUTH_ATTEMPTS_SUMMARY,
    description: docs.LIST_AUTH_ATTEMPTS_DESCRIPTION,
    request: { query: listAuthAttemptsQuerySchema },
    responses: {
      200: {
        description: 'Attempts returned.',
        schema: listObjectSchema(authAttemptSchema),
      },
    },
    handler: controller.listAuthAttempts,
  })

  api.get({
    path: '/:attempt_id',
    operationId: 'auth-attempts-retrieve_auth_attempt',
    summary: docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY,
    description: docs.RETRIEVE_AUTH_ATTEMPT_DESCRIPTION,
    request: { params: attemptIdParamsSchema },
    responses: {
      200: { description: 'Attempt returned.', schema: authAttemptSchema },
      404: { description: 'Authentication attempt not found.' },
    },
    handler: controller.retrieveAuthAttempt,
  })

  const users = createApiRouter({
    tag: 'Users',
    prefix: '/users',
    security: 'admin',
    resolveGuards,
  })

  users.get({
    path: '/:user_id/auth-attempts',
    operationId: 'users-list_user_auth_attempts',
    summary: 'List authentication attempts for a user',
    request: {
      params: userIdParamsSchema,
      query: listAuthAttemptsQuerySchema,
    },
    responses: {
      200: {
        description: 'Attempts returned.',
        schema: listObjectSchema(authAttemptSchema),
      },
    },
    handler: controller.listUserAuthAttempts,
  })

  // Both routers register absolute paths, so nesting one inside the other is
  // only a way to return a single router — it adds no prefix. The user-scoped
  // route lives here rather than in the users module because it is the same
  // resource seen through a filter.
  api.router.use(users.router)
  return api.router
}
