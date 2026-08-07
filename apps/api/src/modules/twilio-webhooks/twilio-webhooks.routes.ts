import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './twilio-webhooks.controller'
import * as docs from './twilio-webhooks.docs'
import {
  twilioCallbackBodySchema,
  voiceTwimlQuerySchema,
  webhookProcessedSchema,
} from './twilio-webhooks.schemas'

/**
 * Public routes: Twilio cannot present a first-party 876 API key, so the
 * request signature is the credential. Every handler verifies it before reading
 * anything out of the payload.
 *
 * The body schema is a permissive record on purpose — see
 * `twilio-webhooks.schemas.ts`. Stripping unknown form fields would change the
 * string the signature is computed over.
 */
export function createTwilioWebhooksRouter(
  resolveGuards: GuardResolver
): Router {
  const api = createApiRouter({
    tag: 'Twilio Webhooks',
    prefix: '/webhooks/twilio',
    security: 'public',
    resolveGuards,
  })

  api.post({
    path: '/messages/status',
    operationId: 'twilio-webhooks-message_status',
    summary: docs.MESSAGE_STATUS_SUMMARY,
    description: docs.MESSAGE_STATUS_DESCRIPTION,
    request: { body: twilioCallbackBodySchema },
    responses: {
      200: {
        description: 'Callback accepted.',
        schema: webhookProcessedSchema,
      },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.messageStatus,
  })

  api.post({
    path: '/messages/inbound',
    operationId: 'twilio-webhooks-message_inbound',
    summary: docs.MESSAGE_INBOUND_SUMMARY,
    description: docs.MESSAGE_INBOUND_DESCRIPTION,
    request: { body: twilioCallbackBodySchema },
    responses: {
      200: {
        description: 'Callback accepted.',
        schema: webhookProcessedSchema,
      },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.messageInbound,
  })

  api.post({
    path: '/calls/status',
    operationId: 'twilio-webhooks-call_status',
    summary: docs.CALL_STATUS_SUMMARY,
    description: docs.CALL_STATUS_DESCRIPTION,
    request: { body: twilioCallbackBodySchema },
    responses: {
      200: {
        description: 'Callback accepted.',
        schema: webhookProcessedSchema,
      },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.callStatus,
  })

  api.post({
    path: '/calls/inbound',
    operationId: 'twilio-webhooks-call_inbound',
    summary: docs.CALL_INBOUND_SUMMARY,
    description: docs.CALL_INBOUND_DESCRIPTION,
    request: { body: twilioCallbackBodySchema },
    responses: {
      200: { description: 'Empty TwiML returned.' },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.callInbound,
  })

  api.post({
    path: '/voice',
    operationId: 'twilio-webhooks-voice_twiml',
    summary: docs.VOICE_TWIML_SUMMARY,
    description: docs.VOICE_TWIML_DESCRIPTION,
    request: { body: twilioCallbackBodySchema, query: voiceTwimlQuerySchema },
    responses: {
      200: { description: 'TwiML for the selected template.' },
      400: {
        description: 'Unknown template, or the key signature did not match.',
      },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.voiceTwiml,
  })

  return api.router
}
