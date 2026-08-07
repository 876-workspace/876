import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './communications.controller'
import * as docs from './communications.docs'
import {
  callIdParamsSchema,
  communicationCallSchema,
  communicationMessageSchema,
  createCallBodySchema,
  createMessageBodySchema,
  createPhoneLookupBodySchema,
  listCommunicationsQuerySchema,
  messageIdParamsSchema,
  phoneLookupSchema,
} from './communications.schemas'

/**
 * Every route is admin, as it is in the FastAPI router: each of these spends
 * real money — a lookup is billed per query, a message and a call per send — so
 * none of it is reachable with an app key alone.
 */
export function createCommunicationsRouter(
  resolveGuards: GuardResolver
): Router {
  const api = createApiRouter({
    tag: 'Communications',
    prefix: '/communications',
    security: 'admin',
    resolveGuards,
  })

  api.post({
    path: '/phone-lookups',
    operationId: 'communications-create_phone_lookup',
    summary: docs.CREATE_PHONE_LOOKUP_SUMMARY,
    description: docs.CREATE_PHONE_LOOKUP_DESCRIPTION,
    request: { body: createPhoneLookupBodySchema },
    responses: {
      200: { description: 'Lookup resolved.', schema: phoneLookupSchema },
    },
    handler: controller.createPhoneLookup,
  })

  api.post({
    path: '/messages',
    operationId: 'communications-create_message',
    summary: docs.CREATE_MESSAGE_SUMMARY,
    description: docs.CREATE_MESSAGE_DESCRIPTION,
    request: { body: createMessageBodySchema },
    responses: {
      201: {
        description: 'Message accepted.',
        schema: communicationMessageSchema,
      },
      400: {
        description: 'The template is unavailable or the channel is off.',
      },
    },
    handler: controller.createMessage,
  })

  api.get({
    path: '/messages',
    operationId: 'communications-list_messages',
    summary: docs.LIST_MESSAGES_SUMMARY,
    description: docs.LIST_MESSAGES_DESCRIPTION,
    request: { query: listCommunicationsQuerySchema },
    responses: {
      200: {
        description: 'Messages returned.',
        schema: listObjectSchema(communicationMessageSchema),
      },
    },
    handler: controller.listMessages,
  })

  api.get({
    path: '/messages/:message_id',
    operationId: 'communications-retrieve_message',
    summary: docs.RETRIEVE_MESSAGE_SUMMARY,
    description: docs.RETRIEVE_MESSAGE_DESCRIPTION,
    request: { params: messageIdParamsSchema },
    responses: {
      200: {
        description: 'Message returned.',
        schema: communicationMessageSchema,
      },
      404: { description: 'Message not found.' },
    },
    handler: controller.retrieveMessage,
  })

  api.post({
    path: '/calls',
    operationId: 'communications-create_call',
    summary: docs.CREATE_CALL_SUMMARY,
    description: docs.CREATE_CALL_DESCRIPTION,
    request: { body: createCallBodySchema },
    responses: {
      201: { description: 'Call accepted.', schema: communicationCallSchema },
      400: { description: 'The template is unavailable or voice is off.' },
      503: { description: 'Outbound voice is not configured.' },
    },
    handler: controller.createCall,
  })

  api.get({
    path: '/calls',
    operationId: 'communications-list_calls',
    summary: docs.LIST_CALLS_SUMMARY,
    description: docs.LIST_CALLS_DESCRIPTION,
    request: { query: listCommunicationsQuerySchema },
    responses: {
      200: {
        description: 'Calls returned.',
        schema: listObjectSchema(communicationCallSchema),
      },
    },
    handler: controller.listCalls,
  })

  api.get({
    path: '/calls/:call_id',
    operationId: 'communications-retrieve_call',
    summary: docs.RETRIEVE_CALL_SUMMARY,
    description: docs.RETRIEVE_CALL_DESCRIPTION,
    request: { params: callIdParamsSchema },
    responses: {
      200: { description: 'Call returned.', schema: communicationCallSchema },
      404: { description: 'Call not found.' },
    },
    handler: controller.retrieveCall,
  })

  return api.router
}
