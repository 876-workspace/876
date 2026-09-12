import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BankMatchCandidateListSchema,
  BankReconciliationListSchema,
  BankReconciliationSchema,
  BankRuleListSchema,
  BankRuleSchema,
  BankStatementCategorizeResultSchema,
  BankStatementImportListSchema,
  BankStatementImportSchema,
  BankStatementImportWithLinesSchema,
  BankStatementLineListSchema,
  BankStatementLineSchema,
  BankStatementMatchSchema,
  BankStatementPreviewSchema,
  BankTransferListSchema,
  BankTransferSchema,
  DeletedBankRuleSchema,
  BankDepositListSchema,
  BankDepositSchema,
} from '../types/banking-engine.schema'
import type {
  BankMatchCandidateList,
  BankReconciliation,
  BankReconciliationCreateParams,
  BankReconciliationList,
  BankRule,
  BankRuleCreateParams,
  BankRuleList,
  BankRuleUpdateParams,
  BankStatementCategorizeParams,
  BankStatementCategorizeResult,
  BankStatementImport,
  BankStatementImportCreateParams,
  BankStatementImportList,
  BankStatementImportWithLines,
  BankStatementLine,
  BankStatementLineList,
  BankStatementMatch,
  BankStatementMatchParams,
  BankStatementPreview,
  BankTransfer,
  BankTransferCreateParams,
  BankTransferList,
  DeletedBankRule,
  BankDeposit,
  BankDepositCreateParams,
  BankDepositList,
  StatementFileImportParams,
  StatementFilePreviewParams,
} from '../types/banking-engine'
import type { RequestOptions } from '../types'

const accountPath = (accountId: string) =>
  `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`
const linePath = (lineId: string) =>
  `/api/v1/banking/statement-lines/${encodeURIComponent(lineId)}`
const importPath = (importId: string) =>
  `/api/v1/banking/statement-imports/${encodeURIComponent(importId)}`
const reconciliationPath = (id: string) =>
  `/api/v1/banking/reconciliations/${encodeURIComponent(id)}`
const rulePath = (id: string) =>
  `/api/v1/banking/rules/${encodeURIComponent(id)}`

export function createBankingEngineResources(runtime: Runtime) {
  const bankStatementImports = {
    list(accountId: string, options?: RequestOptions) {
      return Request<BankStatementImportList>(
        runtime,
        {
          method: 'GET',
          path: `${accountPath(accountId)}/statement-imports`,
          signal: options?.signal,
        },
        BankStatementImportListSchema
      )
    },
    previewFile(
      accountId: string,
      params: StatementFilePreviewParams,
      options?: RequestOptions
    ) {
      return Request<BankStatementPreview>(
        runtime,
        {
          method: 'POST',
          path: `${accountPath(accountId)}/statement-imports/preview`,
          body: params,
          signal: options?.signal,
        },
        BankStatementPreviewSchema
      )
    },
    importFile(
      accountId: string,
      params: StatementFileImportParams,
      options?: RequestOptions
    ) {
      return Request<BankStatementImportWithLines>(
        runtime,
        {
          method: 'POST',
          path: `${accountPath(accountId)}/statement-imports/file`,
          body: params,
          signal: options?.signal,
        },
        BankStatementImportWithLinesSchema
      )
    },
    create(
      accountId: string,
      params: BankStatementImportCreateParams,
      options?: RequestOptions
    ) {
      return Request<BankStatementImportWithLines>(
        runtime,
        {
          method: 'POST',
          path: `${accountPath(accountId)}/statement-imports`,
          body: params,
          signal: options?.signal,
        },
        BankStatementImportWithLinesSchema
      )
    },
    retrieve(importId: string, options?: RequestOptions) {
      return Request<BankStatementImportWithLines>(
        runtime,
        {
          method: 'GET',
          path: importPath(importId),
          signal: options?.signal,
        },
        BankStatementImportWithLinesSchema
      )
    },
    undo(importId: string, options?: RequestOptions) {
      return Request<BankStatementImport>(
        runtime,
        {
          method: 'POST',
          path: `${importPath(importId)}/undo`,
          signal: options?.signal,
        },
        BankStatementImportSchema
      )
    },
  }

  const bankStatementLines = {
    list(accountId: string, options?: RequestOptions) {
      return Request<BankStatementLineList>(
        runtime,
        {
          method: 'GET',
          path: `${accountPath(accountId)}/statement-lines`,
          signal: options?.signal,
        },
        BankStatementLineListSchema
      )
    },
    retrieve(lineId: string, options?: RequestOptions) {
      return Request<BankStatementLine>(
        runtime,
        {
          method: 'GET',
          path: linePath(lineId),
          signal: options?.signal,
        },
        BankStatementLineSchema
      )
    },
    matches(lineId: string, options?: RequestOptions) {
      return Request<BankMatchCandidateList>(
        runtime,
        {
          method: 'GET',
          path: `${linePath(lineId)}/matches`,
          signal: options?.signal,
        },
        BankMatchCandidateListSchema
      )
    },
    match(
      lineId: string,
      params: BankStatementMatchParams,
      options?: RequestOptions
    ) {
      return Request<BankStatementMatch>(
        runtime,
        {
          method: 'POST',
          path: `${linePath(lineId)}/matches`,
          body: params,
          signal: options?.signal,
        },
        BankStatementMatchSchema
      )
    },
    unmatch(lineId: string, options?: RequestOptions) {
      return Request<BankStatementMatch>(
        runtime,
        {
          method: 'POST',
          path: `${linePath(lineId)}/unmatch`,
          signal: options?.signal,
        },
        BankStatementMatchSchema
      )
    },
    categorize(
      lineId: string,
      params: BankStatementCategorizeParams,
      options?: RequestOptions
    ) {
      return Request<BankStatementCategorizeResult>(
        runtime,
        {
          method: 'POST',
          path: `${linePath(lineId)}/categorize`,
          body: params,
          signal: options?.signal,
        },
        BankStatementCategorizeResultSchema
      )
    },
    exclude(lineId: string, options?: RequestOptions) {
      return Request<BankStatementLine>(
        runtime,
        {
          method: 'POST',
          path: `${linePath(lineId)}/exclude`,
          signal: options?.signal,
        },
        BankStatementLineSchema
      )
    },
    restore(lineId: string, options?: RequestOptions) {
      return Request<BankStatementLine>(
        runtime,
        {
          method: 'POST',
          path: `${linePath(lineId)}/restore`,
          signal: options?.signal,
        },
        BankStatementLineSchema
      )
    },
  }

  const bankTransfers = {
    list(options?: RequestOptions) {
      return Request<BankTransferList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/transfers',
          signal: options?.signal,
        },
        BankTransferListSchema
      )
    },
    create(params: BankTransferCreateParams, options?: RequestOptions) {
      return Request<BankTransfer>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/banking/transfers',
          body: params,
          signal: options?.signal,
        },
        BankTransferSchema
      )
    },
  }

  const bankDeposits = {
    list(options?: RequestOptions) {
      return Request<BankDepositList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/deposits',
          signal: options?.signal,
        },
        BankDepositListSchema
      )
    },
    retrieve(id: string, options?: RequestOptions) {
      return Request<BankDeposit>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/banking/deposits/${encodeURIComponent(id)}`,
          signal: options?.signal,
        },
        BankDepositSchema
      )
    },
    create(params: BankDepositCreateParams, options?: RequestOptions) {
      return Request<BankDeposit>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/banking/deposits',
          body: params,
          signal: options?.signal,
        },
        BankDepositSchema
      )
    },
    void(id: string, options?: RequestOptions) {
      return Request<BankDeposit>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/banking/deposits/${encodeURIComponent(id)}/void`,
          signal: options?.signal,
        },
        BankDepositSchema
      )
    },
  }

  const bankReconciliations = {
    list(accountId: string, options?: RequestOptions) {
      return Request<BankReconciliationList>(
        runtime,
        {
          method: 'GET',
          path: `${accountPath(accountId)}/reconciliations`,
          signal: options?.signal,
        },
        BankReconciliationListSchema
      )
    },
    create(
      accountId: string,
      params: BankReconciliationCreateParams,
      options?: RequestOptions
    ) {
      return Request<BankReconciliation>(
        runtime,
        {
          method: 'POST',
          path: `${accountPath(accountId)}/reconciliations`,
          body: params,
          signal: options?.signal,
        },
        BankReconciliationSchema
      )
    },
    retrieve(id: string, options?: RequestOptions) {
      return Request<BankReconciliation>(
        runtime,
        {
          method: 'GET',
          path: reconciliationPath(id),
          signal: options?.signal,
        },
        BankReconciliationSchema
      )
    },
    complete(id: string, options?: RequestOptions) {
      return Request<BankReconciliation>(
        runtime,
        {
          method: 'POST',
          path: `${reconciliationPath(id)}/complete`,
          signal: options?.signal,
        },
        BankReconciliationSchema
      )
    },
    reopen(id: string, options?: RequestOptions) {
      return Request<BankReconciliation>(
        runtime,
        {
          method: 'POST',
          path: `${reconciliationPath(id)}/reopen`,
          signal: options?.signal,
        },
        BankReconciliationSchema
      )
    },
  }

  const bankRules = {
    list(options?: RequestOptions) {
      return Request<BankRuleList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/rules',
          signal: options?.signal,
        },
        BankRuleListSchema
      )
    },
    create(params: BankRuleCreateParams, options?: RequestOptions) {
      return Request<BankRule>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/banking/rules',
          body: params,
          signal: options?.signal,
        },
        BankRuleSchema
      )
    },
    retrieve(id: string, options?: RequestOptions) {
      return Request<BankRule>(
        runtime,
        {
          method: 'GET',
          path: rulePath(id),
          signal: options?.signal,
        },
        BankRuleSchema
      )
    },
    update(id: string, params: BankRuleUpdateParams, options?: RequestOptions) {
      return Request<BankRule>(
        runtime,
        {
          method: 'PATCH',
          path: rulePath(id),
          body: params,
          signal: options?.signal,
        },
        BankRuleSchema
      )
    },
    delete(id: string, options?: RequestOptions) {
      return Request<DeletedBankRule>(
        runtime,
        {
          method: 'DELETE',
          path: rulePath(id),
          signal: options?.signal,
        },
        DeletedBankRuleSchema
      )
    },
  }

  return {
    bankStatementImports,
    bankStatementLines,
    bankTransfers,
    bankDeposits,
    bankReconciliations,
    bankRules,
  }
}
