import type { Router } from 'express'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { listObjectSchema } from '@/http/envelope'

import * as controller from './audit-events.controller'
import * as docs from './audit-events.docs'
import {
  auditEventSchema,
  createAuditEventBodySchema,
  listAuditEventsQuerySchema,
} from './audit-events.schemas'

export function createAuditEventsRouter(resolveGuards: GuardResolver): Router {
  const api = createApiRouter({
    tag: 'Audit Events',
    prefix: '/audit-events',
    security: 'apiKey',
    resolveGuards,
  })

  api.post({
    path: '',
    operationId: 'audit-events-create_audit_event',
    summary: docs.CREATE_AUDIT_EVENT_SUMMARY,
    description: docs.CREATE_AUDIT_EVENT_DESCRIPTION,
    request: { body: createAuditEventBodySchema },
    responses: {
      201: {
        ...docs.CREATE_AUDIT_EVENT_RESPONSES[201],
        schema: auditEventSchema,
      },
      400: docs.CREATE_AUDIT_EVENT_RESPONSES[400],
    },
    handler: controller.createAuditEvent,
  })

  api.get({
    path: '',
    operationId: 'audit-events-list_audit_events',
    summary: docs.LIST_AUDIT_EVENTS_SUMMARY,
    description: docs.LIST_AUDIT_EVENTS_DESCRIPTION,
    security: 'admin',
    request: { query: listAuditEventsQuerySchema },
    responses: {
      200: {
        ...docs.LIST_AUDIT_EVENTS_RESPONSES[200],
        schema: listObjectSchema(auditEventSchema),
      },
    },
    handler: controller.listAuditEvents,
  })

  return api.router
}
