import type { Request, Response } from 'express'
import { z } from 'zod'

import {
  createApiRouter,
  type GuardResolver,
  type ResponseSpec,
} from '@/http/api-router'
import { getPrincipal } from '@/http/auth'
import { validParams } from '@/http/middleware/validate'
import { errorEnvelopeSchema, successEnvelopeSchema } from '@/http/envelope'

import { uncategorizeStatementLine } from './banking-categorization.service'
import {
  statementLineParamsSchema,
  statementLineSchema,
} from './banking-engine.schemas'

const resultSchema = z.object({
  statementLine: statementLineSchema,
  removedBankTransactionId: z.string(),
})

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}

export function createBankingCategorizationRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })

  api.post({
    path: '/banking/statement-lines/:lineId/uncategorize',
    operationId: 'billing-banking_uncategorize_statement_line',
    summary: 'Reverse a Banking-created statement categorization',
    description:
      'Removes the manual cash transaction created by categorization and returns the statement line to unresolved state. Pre-existing matched cash is never deleted by this command.',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Statement categorization reversed.',
        schema: successEnvelopeSchema(resultSchema),
      },
      '4XX': invalid,
    },
    handler: async (req: Request, res: Response) => {
      const { lineId } = validParams<{ lineId: string }>(req)
      const tenantId = getPrincipal(req).tenantId
      if (!tenantId) throw new Error('Tenant guard did not resolve a tenant.')
      res.json(await uncategorizeStatementLine(tenantId, lineId))
    },
  })

  return api.router
}
