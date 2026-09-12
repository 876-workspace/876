import {
  createApiRouter,
  type GuardResolver,
  type ResponseSpec,
} from '@/http/api-router'
import {
  errorEnvelopeSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import { bankingEngineController } from './banking-engine.controller'
import { accountStatementParamsSchema } from './banking-engine.schemas'
import {
  statementFilePreviewBodySchema,
  statementFilePreviewSchema,
} from './banking-statement-file.schemas'

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}

/**
 * Statement-file normalization is kept separate from statement persistence so
 * users can change column mappings until the preview is correct. The preview
 * performs no accounting or database write.
 */
export function createBankingStatementFileRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })

  api.post({
    path: '/banking/accounts/:accountId/statement-imports/preview',
    operationId: 'billing-banking_preview_statement_file',
    summary: 'Preview a CSV or TSV bank statement',
    description:
      'Parses uploaded statement text using an explicit column mapping and returns normalized bank evidence without persisting or booking it.',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: accountStatementParamsSchema,
      body: statementFilePreviewBodySchema,
    },
    responses: {
      200: {
        description: 'Statement preview returned.',
        schema: successEnvelopeSchema(statementFilePreviewSchema),
      },
      '4XX': invalid,
    },
    handler: bankingEngineController.previewStatementFile,
  })

  return api.router
}
