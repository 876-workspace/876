import { createApiRouter, type GuardResolver } from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import * as controller from './mailboxes.controller'
import {
  listMailboxesQuerySchema,
  mailboxAllocationSchema,
  mailboxSchema,
  tenantIdParamsSchema,
} from './mailboxes.schemas'

export function createMailboxesRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({
    tag: 'Mailboxes',
    prefix: '/v1/tenants/:tenantId/mailboxes',
    resolveGuards,
  })

  api.get({
    path: '',
    security: 'admin',
    operationId: 'mailboxes-list',
    summary: 'List a tenant’s mailboxes',
    request: {
      params: tenantIdParamsSchema,
      query: listMailboxesQuerySchema,
    },
    responses: {
      200: {
        description: 'Mailboxes returned.',
        schema: successEnvelopeSchema(listObjectSchema(mailboxSchema)),
      },
    },
    handler: controller.listMailboxes,
  })

  api.post({
    path: '/allocations',
    security: 'admin',
    operationId: 'mailboxes-allocate',
    summary: 'Allocate an available tenant mailbox number',
    request: { params: tenantIdParamsSchema },
    responses: {
      200: {
        description: 'Mailbox number allocated.',
        schema: successEnvelopeSchema(mailboxAllocationSchema),
      },
      404: { description: 'Tenant not found.', schema: errorEnvelopeSchema },
      503: {
        description: 'Mailbox numbers are temporarily unavailable.',
        schema: errorEnvelopeSchema,
      },
    },
    handler: controller.allocateMailbox,
  })

  return api.router
}
