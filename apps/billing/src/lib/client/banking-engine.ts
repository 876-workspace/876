import type {
  BankMatchCandidateList,
  BankReconciliation,
  BankReconciliationCreateParams,
  BankReconciliationList,
  BankRuleCreateParams,
  BankRuleList,
  BankStatementCategorizeParams,
  BankStatementCategorizeResult,
  BankStatementImportWithLines,
  BankStatementLine,
  BankStatementLineList,
  BankStatementMatch,
  BankStatementMatchParams,
  BankStatementPreview,
  BankDeposit,
  BankDepositCreateParams,
  BankDepositList,
  StatementFileImportParams,
  StatementFilePreviewParams,
} from '@876/billing'

import { request } from './request'

const accountPath = (accountId: string) =>
  `/api/v1/banking/accounts/${encodeURIComponent(accountId)}`
const linePath = (lineId: string) =>
  `/api/v1/banking/statement-lines/${encodeURIComponent(lineId)}`
const reconciliationPath = (id: string) =>
  `/api/v1/banking/reconciliations/${encodeURIComponent(id)}`

export const bankStatementImports = {
  previewFile(accountId: string, params: StatementFilePreviewParams) {
    return request<BankStatementPreview>(
      `${accountPath(accountId)}/statement-imports/preview`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  importFile(accountId: string, params: StatementFileImportParams) {
    return request<BankStatementImportWithLines>(
      `${accountPath(accountId)}/statement-imports/file`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
}

export const bankStatementLines = {
  list(accountId: string) {
    return request<BankStatementLineList>(
      `${accountPath(accountId)}/statement-lines`
    )
  },

  matches(lineId: string) {
    return request<BankMatchCandidateList>(`${linePath(lineId)}/matches`)
  },

  match(lineId: string, params: BankStatementMatchParams) {
    return request<BankStatementMatch>(`${linePath(lineId)}/matches`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  unmatch(lineId: string) {
    return request<BankStatementMatch>(`${linePath(lineId)}/unmatch`, {
      method: 'POST',
    })
  },

  categorize(lineId: string, params: BankStatementCategorizeParams) {
    return request<BankStatementCategorizeResult>(
      `${linePath(lineId)}/categorize`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  exclude(lineId: string) {
    return request<BankStatementLine>(`${linePath(lineId)}/exclude`, {
      method: 'POST',
    })
  },

  restore(lineId: string) {
    return request<BankStatementLine>(`${linePath(lineId)}/restore`, {
      method: 'POST',
    })
  },
}

export const bankReconciliations = {
  list(accountId: string) {
    return request<BankReconciliationList>(
      `${accountPath(accountId)}/reconciliations`
    )
  },

  create(accountId: string, params: BankReconciliationCreateParams) {
    return request<BankReconciliation>(
      `${accountPath(accountId)}/reconciliations`,
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  complete(id: string) {
    return request<BankReconciliation>(`${reconciliationPath(id)}/complete`, {
      method: 'POST',
    })
  },

  reopen(id: string) {
    return request<BankReconciliation>(`${reconciliationPath(id)}/reopen`, {
      method: 'POST',
    })
  },
}

export const bankDeposits = {
  list() {
    return request<BankDepositList>('/api/banking/deposits')
  },
  create(params: BankDepositCreateParams) {
    return request<BankDeposit>('/api/banking/deposits', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  retrieve(id: string) {
    return request<BankDeposit>(depositPath(id))
  },
  void(id: string) {
    return request<BankDeposit>(`${depositPath(id)}/void`, { method: 'POST' })
  },
}

export const bankRules = {
  list() {
    return request<BankRuleList>('/api/v1/banking/rules')
  },

  create(params: BankRuleCreateParams) {
    return request('/api/v1/banking/rules', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
const depositPath = (id: string) =>
  `/api/banking/deposits/${encodeURIComponent(id)}`
