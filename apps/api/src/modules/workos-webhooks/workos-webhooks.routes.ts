import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'

import * as controller from './workos-webhooks.controller'
import * as docs from './workos-webhooks.docs'
import {
  webhookProcessedSchema,
  workosWebhookEventSchema,
} from './workos-webhooks.schemas'

/** Public WorkOS event endpoint; its request signature is the credential. */
export function createWorkosWebhooksRouter(
  resolveGuards: GuardResolver
): Router {
  const api = createApiRouter({
    tag: 'WorkOS Webhooks',
    prefix: '/webhooks/workos',
    security: 'public',
    resolveGuards,
  })

  api.post({
    path: '/',
    operationId: 'workos-webhooks-receive',
    summary: docs.RECEIVE_SUMMARY,
    description: docs.RECEIVE_DESCRIPTION,
    request: { body: workosWebhookEventSchema },
    responses: {
      200: {
        description: 'Event acknowledged.',
        schema: webhookProcessedSchema,
      },
      403: { description: 'The request signature did not verify.' },
    },
    handler: controller.receive,
  })

  return api.router
}
