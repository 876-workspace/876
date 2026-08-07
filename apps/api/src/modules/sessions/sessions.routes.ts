import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './sessions.controller'
import * as docs from './sessions.docs'
import {
  listSessionsQuerySchema,
  listUserSessionsQuerySchema,
  sessionDeletedSchema,
  sessionIdParamsSchema,
  sessionSchema,
  userIdParamsSchema,
  userSessionsDeletedSchema,
} from './sessions.schemas'

/**
 * Sessions are administrative: every route is admin-only, as in the FastAPI
 * router where each carries AdminDep. The user-scoped paths live here rather
 * than in the users module because they are the same resource seen through a
 * filter, and splitting them would put session logic in two places.
 */
export function createSessionsRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Sessions',
    security: 'admin',
    resolveGuards,
  })

  api.get({
    path: '/sessions',
    operationId: 'sessions-list_sessions',
    summary: docs.LIST_SESSIONS_SUMMARY,
    description: docs.LIST_SESSIONS_DESCRIPTION,
    request: { query: listSessionsQuerySchema },
    responses: {
      200: {
        description: 'Sessions returned.',
        schema: listObjectSchema(sessionSchema),
      },
    },
    handler: controller.listSessions,
  })

  api.get({
    path: '/sessions/:session_id',
    operationId: 'sessions-retrieve_session',
    summary: docs.RETRIEVE_SESSION_SUMMARY,
    description: docs.RETRIEVE_SESSION_DESCRIPTION,
    request: { params: sessionIdParamsSchema },
    responses: {
      200: { description: 'Session returned.', schema: sessionSchema },
      404: { description: 'Session not found.' },
    },
    handler: controller.retrieveSession,
  })

  api.delete({
    path: '/sessions/:session_id',
    operationId: 'sessions-revoke_session',
    summary: docs.REVOKE_SESSION_SUMMARY,
    description: docs.REVOKE_SESSION_DESCRIPTION,
    request: { params: sessionIdParamsSchema },
    responses: {
      200: { description: 'Session revoked.', schema: sessionDeletedSchema },
      404: { description: 'Session not found.' },
    },
    handler: controller.revokeSession,
  })

  api.get({
    path: '/users/:user_id/sessions',
    operationId: 'sessions-list_user_sessions',
    summary: 'List sessions for a user',
    request: {
      params: userIdParamsSchema,
      query: listUserSessionsQuerySchema,
    },
    responses: {
      200: {
        description: 'Sessions returned.',
        schema: listObjectSchema(sessionSchema),
      },
    },
    handler: controller.listUserSessions,
  })

  api.delete({
    path: '/users/:user_id/sessions',
    operationId: 'sessions-revoke_user_sessions',
    summary: docs.REVOKE_USER_SESSIONS_SUMMARY,
    description: docs.REVOKE_USER_SESSIONS_DESCRIPTION,
    responses: {
      200: {
        description: 'Sessions revoked.',
        schema: userSessionsDeletedSchema,
      },
    },
    request: { params: userIdParamsSchema },
    handler: controller.revokeUserSessions,
  })

  return api.router
}
