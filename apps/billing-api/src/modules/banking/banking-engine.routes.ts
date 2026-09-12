import {
  createApiRouter,
  type GuardResolver,
  type ResponseSpec,
} from '@/http/api-router'
import {
  errorEnvelopeSchema,
  listObjectSchema,
  successEnvelopeSchema,
} from '@/http/envelope'

import { bankingEngineController } from './banking-engine.controller'
import { bankingEngineDocs } from './banking-engine.docs'
import {
  accountStatementParamsSchema,
  bankRuleCreateBodySchema,
  bankRuleParamsSchema,
  bankRuleSchema,
  bankRuleUpdateBodySchema,
  bankTransferCreateBodySchema,
  bankTransferSchema,
  deletedBankRuleSchema,
  matchCandidateSchema,
  reconciliationCreateBodySchema,
  reconciliationParamsSchema,
  reconciliationSchema,
  statementCategorizeBodySchema,
  statementCategorizeResultSchema,
  statementImportCreateBodySchema,
  statementImportParamsSchema,
  statementImportSchema,
  statementImportWithLinesSchema,
  statementLineParamsSchema,
  statementLineSchema,
  statementMatchBodySchema,
  statementMatchSchema,
} from './banking-engine.schemas'

const invalid: ResponseSpec = {
  description: 'Validation Error',
  schema: errorEnvelopeSchema,
}
const clientErrors = { '4XX': invalid }

export function createBankingEngineRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter({ tag: 'Billing', resolveGuards })

  api.get({
    path: '/banking/accounts/:accountId/statement-imports',
    ...bankingEngineDocs.listStatementImports,
    operationId: 'billing-banking_list_statement_imports',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: accountStatementParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(statementImportSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listStatementImports,
  })

  api.post({
    path: '/banking/accounts/:accountId/statement-imports',
    ...bankingEngineDocs.createStatementImport,
    operationId: 'billing-banking_create_statement_import',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: accountStatementParamsSchema,
      body: statementImportCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementImportWithLinesSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.createStatementImport,
  })

  api.get({
    path: '/banking/statement-imports/:importId',
    ...bankingEngineDocs.retrieveStatementImport,
    operationId: 'billing-banking_retrieve_statement_import',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: statementImportParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementImportWithLinesSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.retrieveStatementImport,
  })

  api.post({
    path: '/banking/statement-imports/:importId/undo',
    ...bankingEngineDocs.undoStatementImport,
    operationId: 'billing-banking_undo_statement_import',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: statementImportParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementImportSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.undoStatementImport,
  })

  api.get({
    path: '/banking/accounts/:accountId/statement-lines',
    ...bankingEngineDocs.listStatementLines,
    operationId: 'billing-banking_list_statement_lines',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: accountStatementParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(statementLineSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listStatementLines,
  })

  api.get({
    path: '/banking/statement-lines/:lineId',
    ...bankingEngineDocs.retrieveStatementLine,
    operationId: 'billing-banking_retrieve_statement_line',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementLineSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.retrieveStatementLine,
  })

  api.get({
    path: '/banking/statement-lines/:lineId/matches',
    ...bankingEngineDocs.listMatchCandidates,
    operationId: 'billing-banking_list_statement_match_candidates',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(matchCandidateSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listMatchCandidates,
  })

  api.post({
    path: '/banking/statement-lines/:lineId/matches',
    ...bankingEngineDocs.matchStatementLine,
    operationId: 'billing-banking_match_statement_line',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: statementLineParamsSchema,
      body: statementMatchBodySchema,
    },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementMatchSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.matchStatementLine,
  })

  api.post({
    path: '/banking/statement-lines/:lineId/unmatch',
    ...bankingEngineDocs.unmatchStatementLine,
    operationId: 'billing-banking_unmatch_statement_line',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementMatchSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.unmatchStatementLine,
  })

  api.post({
    path: '/banking/statement-lines/:lineId/categorize',
    ...bankingEngineDocs.categorizeStatementLine,
    operationId: 'billing-banking_categorize_statement_line',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: statementLineParamsSchema,
      body: statementCategorizeBodySchema,
    },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementCategorizeResultSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.categorizeStatementLine,
  })

  api.post({
    path: '/banking/statement-lines/:lineId/exclude',
    ...bankingEngineDocs.excludeStatementLine,
    operationId: 'billing-banking_exclude_statement_line',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementLineSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.excludeStatementLine,
  })

  api.post({
    path: '/banking/statement-lines/:lineId/restore',
    ...bankingEngineDocs.restoreStatementLine,
    operationId: 'billing-banking_restore_statement_line',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: statementLineParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(statementLineSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.restoreStatementLine,
  })

  api.get({
    path: '/banking/transfers',
    ...bankingEngineDocs.listTransfers,
    operationId: 'billing-banking_list_transfers',
    security: { kind: 'tenant', permission: 'banking:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(bankTransferSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listTransfers,
  })

  api.post({
    path: '/banking/transfers',
    ...bankingEngineDocs.createTransfer,
    operationId: 'billing-banking_create_transfer',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { body: bankTransferCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankTransferSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.createTransfer,
  })

  api.get({
    path: '/banking/accounts/:accountId/reconciliations',
    ...bankingEngineDocs.listReconciliations,
    operationId: 'billing-banking_list_reconciliations',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: accountStatementParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(reconciliationSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listReconciliations,
  })

  api.post({
    path: '/banking/accounts/:accountId/reconciliations',
    ...bankingEngineDocs.createReconciliation,
    operationId: 'billing-banking_create_reconciliation',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: accountStatementParamsSchema,
      body: reconciliationCreateBodySchema,
    },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(reconciliationSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.createReconciliation,
  })

  api.get({
    path: '/banking/reconciliations/:reconciliationId',
    ...bankingEngineDocs.retrieveReconciliation,
    operationId: 'billing-banking_retrieve_reconciliation',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: reconciliationParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(reconciliationSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.retrieveReconciliation,
  })

  api.post({
    path: '/banking/reconciliations/:reconciliationId/complete',
    ...bankingEngineDocs.completeReconciliation,
    operationId: 'billing-banking_complete_reconciliation',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: reconciliationParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(reconciliationSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.completeReconciliation,
  })

  api.post({
    path: '/banking/reconciliations/:reconciliationId/reopen',
    ...bankingEngineDocs.reopenReconciliation,
    operationId: 'billing-banking_reopen_reconciliation',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: reconciliationParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(reconciliationSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.reopenReconciliation,
  })

  api.get({
    path: '/banking/rules',
    ...bankingEngineDocs.listRules,
    operationId: 'billing-banking_list_rules',
    security: { kind: 'tenant', permission: 'banking:read' },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(listObjectSchema(bankRuleSchema)),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.listRules,
  })

  api.post({
    path: '/banking/rules',
    ...bankingEngineDocs.createRule,
    operationId: 'billing-banking_create_rule',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { body: bankRuleCreateBodySchema },
    responses: {
      201: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankRuleSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.createRule,
  })

  api.get({
    path: '/banking/rules/:ruleId',
    ...bankingEngineDocs.retrieveRule,
    operationId: 'billing-banking_retrieve_rule',
    security: { kind: 'tenant', permission: 'banking:read' },
    request: { params: bankRuleParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankRuleSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.retrieveRule,
  })

  api.patch({
    path: '/banking/rules/:ruleId',
    ...bankingEngineDocs.updateRule,
    operationId: 'billing-banking_update_rule',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: {
      params: bankRuleParamsSchema,
      body: bankRuleUpdateBodySchema,
    },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(bankRuleSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.updateRule,
  })

  api.delete({
    path: '/banking/rules/:ruleId',
    ...bankingEngineDocs.deleteRule,
    operationId: 'billing-banking_delete_rule',
    security: { kind: 'tenant', permission: 'banking:write' },
    request: { params: bankRuleParamsSchema },
    responses: {
      200: {
        description: 'Successful Response',
        schema: successEnvelopeSchema(deletedBankRuleSchema),
      },
      ...clientErrors,
    },
    handler: bankingEngineController.deleteRule,
  })

  return api.router
}
