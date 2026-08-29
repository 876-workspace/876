import { z } from 'zod'

import { createApiRouter, type GuardResolver } from '@/http/api-router'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { financeConnectionsController } from './finance-connections.controller'
import {
  billingAppStatsSchema,
  billingAppStatsDetailSchema,
  financeProvisioningResultSchema,
  organizationParamsSchema,
  sourceAppParamsSchema,
} from './finance-connections.schemas'

const looseBankAccountSchema = z
  .object({
    object: z.literal('bank_account'),
    id: z.string(),
  })
  .loose()

export function createFinanceConnectionsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })
  api.post({
    path: '/admin/finance-connections/ensure',
    summary: 'Billing POST /admin/finance-connections/ensure',
    description:
      'Ported from `src/app/api/admin/finance-connections/ensure/route.ts`.',
    operationId: 'billing-billing_post_admin_finance_connections_ensure',
    security: { kind: 'admin' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(financeProvisioningResultSchema),
      },
    },
    handler: financeConnectionsController.ensure,
  })
  api.get({
    path: '/admin/stats/apps',
    summary: 'Billing GET /admin/stats/apps',
    description: 'Ported from `src/app/api/admin/stats/apps/route.ts`.',
    operationId: 'billing-billing_get_admin_stats_apps',
    security: { kind: 'admin' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(
          z.strictObject({
            object: z.literal('list'),
            data: z.array(billingAppStatsSchema),
          })
        ),
      },
    },
    handler: financeConnectionsController.stats,
  })
  api.get({
    path: '/admin/stats/apps/:sourceAppId',
    summary: 'Billing GET /admin/stats/apps/{sourceAppId}',
    description:
      'Ported from `src/app/api/admin/stats/apps/[sourceAppId]/route.ts`.',
    operationId: 'billing-billing_get_admin_stats_apps_sourceAppId',
    security: { kind: 'admin' },
    request: { params: sourceAppParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(billingAppStatsDetailSchema),
      },
    },
    handler: financeConnectionsController.statsForApp,
  })
  return api.router
}

export function createIntegrationBankAccountsRouter(
  resolveGuards: GuardResolver
) {
  const api = createApiRouter({
    tag: 'Organization integrations',
    resolveGuards,
  })
  api.get({
    path: '/integrations/organizations/:organizationId/bank-accounts',
    summary: 'List shared deposit accounts',
    security: { kind: 'integration', scope: 'billing.payments.read' },
    request: { params: organizationParamsSchema },
    responses: {
      200: {
        description: 'bank_account list',
        schema: successEnvelopeSchema(
          z.object({
            object: z.literal('list'),
            data: z.array(looseBankAccountSchema),
            has_more: z.boolean(),
            total_count: z.number().int().nullable(),
            url: z.string(),
          })
        ),
      },
      '4XX': { description: 'Client-safe error', schema: errorEnvelopeSchema },
    },
    handler: financeConnectionsController.integrationBankAccounts,
  })
  return api.router
}
