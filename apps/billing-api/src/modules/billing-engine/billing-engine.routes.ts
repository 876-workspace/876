import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'
import { BillingSweepSchema } from '@/modules/subscriptions'

import { billingEngineController as controller } from './billing-engine.controller'

const result = z
  .object({
    object: z.literal('billing_engine_run'),
    id: z.string(),
    asOf: z.number().int(),
    processed: z.number().int(),
    succeeded: z.number().int(),
    failed: z.number().int(),
    skipped: z.number().int(),
    invoiceIds: z.array(z.string()),
  })
  .strict()

export function createBillingEngineRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Admin sync', resolveGuards })
  api.post({
    path: '/admin/billing/run',
    summary: 'Run a bounded provider-independent billing sweep',
    security: { kind: 'admin' },
    request: { body: BillingSweepSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(result),
      },
      '4XX': { description: 'Client Error', schema: errorEnvelopeSchema },
    },
    handler: controller.run,
  })

  return api.router
}

export function createInternalBillingEngineRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Billing scheduler',
    registry: 'internal',
    resolveGuards,
  })
  api.post({
    path: '/billing-sweep',
    summary: 'Run the scheduled Billing sweep',
    security: { kind: 'scheduler' },
    request: { body: BillingSweepSchema },
    responses: {
      200: {
        description: 'Billing sweep completed',
        schema: successEnvelopeSchema(result),
      },
      503: { description: 'Writer inactive', schema: errorEnvelopeSchema },
    },
    handler: controller.run,
  })

  return api.router
}
