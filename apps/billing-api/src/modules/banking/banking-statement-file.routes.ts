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
import {
  accountStatementParamsSchema,
  statementImportWithLinesSchema,
} from './banking-engine.schemas'
import {
  statementFileImportBodySchema,
  statementFilePreviewBodySchema,
  statementFilePreviewSchema,
} from './banking-statement-file.schemas'

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}

/**
 * File normalization is separate from persistence so users can adjust mappings
 * until preview is correct. The import command re-runs the same parser before
 * creating statement evidence.
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

  api.post({
    path: '/banking/accounts/:accountId/statement-imports/file',
    operationId: 'billing-banking_import_statement_file',
    summary: 'Import a validated CSV or TSV bank statement',
    description:
      'Re-parses the source statement with the approved mapping and persists normalized external bank evidence only when every row is valid.',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: accountStatementParamsSchema,
      body: statementFileImportBodySchema,
    },
    responses: {
      201: {
        description: 'Statement imported.',
        schema: successEnvelopeSchema(statementImportWithLinesSchema),
      },
      '4XX': invalid,
    },
    handler: bankingEngineController.importStatementFile,
  })

  return api.router
}
