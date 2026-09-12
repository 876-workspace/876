import type { List, RequestOptions } from './common'

export type StatementLineType = 'credit' | 'debit'
export type StatementLineStatus =
  | 'uncategorized'
  | 'recognized'
  | 'matched'
  | 'categorized'
  | 'excluded'
export type StatementImportSource = 'file' | 'email' | 'feed' | 'api'
export type StatementFormat =
  | 'csv'
  | 'tsv'
  | 'ofx'
  | 'qif'
  | 'camt-053'
  | 'camt-054'
  | 'mt940'

export interface BankStatementLineInput {
  externalId?: string | null
  postedAt: number
  authorizedAt?: number | null
  type: StatementLineType
  /** Positive integer minor-unit string. */
  amount: string
  currency: string
  description?: string | null
  payee?: string | null
  reference?: string | null
  bankCategory?: string | null
  /** Signed integer minor-unit string. */
  runningBalance?: string | null
}

export interface BankStatementImportCreateParams {
  source: StatementImportSource
  format?: StatementFormat | null
  sourceFileId?: string | null
  sourceName?: string | null
  mapping?: Record<string, unknown> | null
  lines: BankStatementLineInput[]
}

export type StatementDateFormat =
  | 'yyyy-mm-dd'
  | 'dd/mm/yyyy'
  | 'mm/dd/yyyy'
  | 'dd-mm-yyyy'
  | 'mm-dd-yyyy'

export interface StatementNumberFormat {
  decimalSeparator?: '.' | ','
  thousandsSeparator?: ',' | '.' | 'space' | 'none'
}

interface StatementFileMappingBase {
  dateColumn: string
  dateFormat: StatementDateFormat
  descriptionColumn?: string | null
  payeeColumn?: string | null
  referenceColumn?: string | null
  externalIdColumn?: string | null
  balanceColumn?: string | null
  numberFormat?: StatementNumberFormat
}

export type StatementFileMapping =
  | (StatementFileMappingBase & {
      amountMode: 'signed'
      amountColumn: string
      /** Direction represented by a positive value in the source statement. */
      positiveDirection?: StatementLineType
    })
  | (StatementFileMappingBase & {
      amountMode: 'debit-credit'
      debitColumn: string
      creditColumn: string
    })

export interface StatementFilePreviewParams {
  format: 'csv' | 'tsv'
  content: string
  currency: string
  mapping: StatementFileMapping
}

export interface StatementFileImportParams extends StatementFilePreviewParams {
  /** Opaque 876 Storage id when the original file has already been persisted. */
  sourceFileId?: string | null
  sourceName?: string | null
}

export interface StatementPreviewLine {
  sourceRowNumber: number
  externalId: string | null
  postedAt: number
  type: StatementLineType
  amount: string
  currency: string
  description: string | null
  payee: string | null
  reference: string | null
  runningBalance: string | null
}

export interface StatementPreviewError {
  rowNumber: number
  field: string
  message: string
}

/** Public aliases follow the Banking resource naming convention. */
export type BankStatementPreviewLine = StatementPreviewLine
export type BankStatementPreviewError = StatementPreviewError

export interface BankStatementPreview {
  object: 'bank-statement-preview'
  accountId: string
  format: 'csv' | 'tsv'
  currency: string
  headers: string[]
  totalRows: number
  validRows: number
  invalidRows: number
  lines: StatementPreviewLine[]
  errors: StatementPreviewError[]
}

export interface BankStatementImport {
  object: 'bank-statement-import'
  id: string
  accountId: string
  source: StatementImportSource
  format: StatementFormat | null
  sourceFileId: string | null
  sourceName: string | null
  status: 'pending' | 'completed' | 'undone' | 'failed'
  transactionCount: number
  duplicateCount: number
  completedAt: number | null
  undoneAt: number | null
  createdAt: number
  updatedAt: number
}

export interface BankStatementLine {
  object: 'bank-statement-line'
  id: string
  accountId: string
  importId: string
  externalId: string | null
  fingerprint: string
  postedAt: number
  authorizedAt: number | null
  type: StatementLineType
  amount: string
  currency: string
  description: string | null
  payee: string | null
  reference: string | null
  bankCategory: string | null
  runningBalance: string | null
  status: StatementLineStatus
  recognitionSource: 'rule' | 'heuristic' | 'ai' | null
  recognizedRuleId: string | null
  duplicateOfId: string | null
  excludedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface BankStatementImportWithLines extends BankStatementImport {
  lines: BankStatementLine[]
}

export interface BankStatementMatchItem {
  object: 'bank-statement-match-item'
  id: string
  bankTransactionId: string
  amount: string
}

export interface BankStatementMatch {
  object: 'bank-statement-match'
  id: string
  statementLineId: string
  status: 'active' | 'reversed'
  matchedAt: number
  reversedAt: number | null
  items: BankStatementMatchItem[]
}

export interface BankStatementMatchParams {
  items: Array<{ bankTransactionId: string; amount: string }>
}

export interface BankMatchCandidate {
  object: 'bank-match-candidate'
  bankTransactionId: string
  paymentId: string | null
  type: StatementLineType
  amount: string
  availableAmount: string
  date: number
  description: string | null
  reference: string | null
  score: number
  confidence: 'exact' | 'strong' | 'possible'
}

export interface BankStatementCategorizeParams {
  action: 'manual-deposit' | 'manual-withdrawal'
}

export interface BankStatementCategorizeResult {
  statementLine: BankStatementLine
  match: BankStatementMatch
  bankTransactionId: string
}

export interface BankTransferCreateParams {
  fromAccountId: string
  toAccountId: string
  amount: string
  currency: string
  transferredAt: number
  description?: string | null
  reference?: string | null
}

export interface BankTransfer {
  object: 'bank-transfer'
  id: string
  fromAccountId: string
  toAccountId: string
  amount: string
  currency: string
  transferredAt: number
  description: string | null
  reference: string | null
  status: 'posted' | 'reversed'
  reversedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface BankReconciliationCreateParams {
  startAt: number
  endAt: number
  openingBalance: string
  closingBalance: string
  bankTransactionIds?: string[]
}

export interface BankReconciliation {
  object: 'bank-reconciliation'
  id: string
  accountId: string
  startAt: number
  endAt: number
  openingBalance: string
  closingBalance: string
  clearedBalance: string
  difference: string
  status: 'draft' | 'completed' | 'reopened'
  completedAt: number | null
  reopenedAt: number | null
  createdAt: number
  updatedAt: number
  bankTransactionIds: string[]
}

export type BankRuleField =
  | 'description'
  | 'payee'
  | 'reference'
  | 'amount'
  | 'type'
export type BankRuleOperator =
  | 'equals'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
export interface BankRuleConditionParams {
  field: BankRuleField
  operator: BankRuleOperator
  value: string
}
export interface BankRuleAction {
  type: 'manual-deposit' | 'manual-withdrawal' | 'review'
  note?: string | null
}
export interface BankRuleCreateParams {
  name: string
  priority?: number
  enabled?: boolean
  matchMode?: 'all' | 'any'
  automationMode?: 'recognize' | 'auto-categorize'
  accountIds?: string[]
  conditions: BankRuleConditionParams[]
  action: BankRuleAction
}
export interface BankRuleUpdateParams {
  name?: string
  priority?: number
  enabled?: boolean
  matchMode?: 'all' | 'any'
  automationMode?: 'recognize' | 'auto-categorize'
  accountIds?: string[]
  conditions?: BankRuleConditionParams[]
  action?: BankRuleAction
}
export interface BankRule {
  object: 'bank-rule'
  id: string
  name: string
  priority: number
  enabled: boolean
  matchMode: 'all' | 'any'
  automationMode: 'recognize' | 'auto-categorize'
  accountIds: string[]
  conditions: Array<BankRuleConditionParams & { id: string }>
  action: BankRuleAction
  createdAt: number
  updatedAt: number
}
export interface DeletedBankRule {
  object: 'bank-rule'
  id: string
  deleted: true
}

export type BankStatementImportList = List<BankStatementImport>
export type BankStatementLineList = List<BankStatementLine>
export type BankMatchCandidateList = List<BankMatchCandidate>
export type BankTransferList = List<BankTransfer>
export type BankReconciliationList = List<BankReconciliation>
export type BankRuleList = List<BankRule>

export interface BankingRequestOptions extends RequestOptions {}
