import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { accountingSyncController as controller } from './accounting-sync.controller'
import {
  accountingSyncRunBodySchema,
  accountingSyncRunSchema,
} from './accounting-providers.schemas'

export function createInternalAccountingProvidersRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Accounting Providers',
    registry: 'internal',
    resolveGuards,
  })
  api.post({
    path: '/accounting-sync',
    summary: 'Run a bounded accounting-provider synchronization sweep',
    security: { kind: 'scheduler' },
    request: { body: accountingSyncRunBodySchema },
    responses: {
      200: {
        description: 'Accounting synchronization sweep completed',
        schema: successEnvelopeSchema(accountingSyncRunSchema),
      },
      '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
      '5XX': { description: 'Provider Error', schema: errorEnvelopeSchema },
    },
    handler: controller.run,
  })
  return api.router
}
