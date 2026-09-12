import type {
  BankReconciliation,
  BankRule,
  BankRuleAccount,
  BankRuleCondition,
  BankStatementImport,
  BankStatementLine,
  BankStatementMatch,
  BankStatementMatchItem,
  BankTransfer,
  BankDeposit,
} from '@/db'

const importSource = {
  FILE: 'file',
  EMAIL: 'email',
  FEED: 'feed',
  API: 'api',
} as const
const statementFormat = {
  CSV: 'csv',
  TSV: 'tsv',
  OFX: 'ofx',
  QIF: 'qif',
  CAMT_053: 'camt-053',
  CAMT_054: 'camt-054',
  MT940: 'mt940',
} as const
const importStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  UNDONE: 'undone',
  FAILED: 'failed',
} as const
const lineStatus = {
  UNCATEGORIZED: 'uncategorized',
  RECOGNIZED: 'recognized',
  MATCHED: 'matched',
  CATEGORIZED: 'categorized',
  EXCLUDED: 'excluded',
} as const
const recognitionSource = {
  RULE: 'rule',
  HEURISTIC: 'heuristic',
  AI: 'ai',
} as const
const matchStatus = {
  ACTIVE: 'active',
  REVERSED: 'reversed',
} as const
const reconciliationStatus = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  REOPENED: 'reopened',
} as const
const transferStatus = {
  POSTED: 'posted',
  REVERSED: 'reversed',
} as const
const depositStatus = { POSTED: 'posted', REVERSED: 'reversed' } as const
const ruleField = {
  DESCRIPTION: 'description',
  PAYEE: 'payee',
  REFERENCE: 'reference',
  AMOUNT: 'amount',
  TYPE: 'type',
} as const
const ruleOperator = {
  EQUALS: 'equals',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts-with',
  ENDS_WITH: 'ends-with',
  GREATER_THAN: 'greater-than',
  LESS_THAN: 'less-than',
} as const

export function serializeStatementImport(row: BankStatementImport) {
  return {
    object: 'bank-statement-import' as const,
    id: row.id,
    accountId: row.accountId,
    source: importSource[row.source],
    format: row.format ? statementFormat[row.format] : null,
    sourceFileId: row.sourceFileId,
    sourceName: row.sourceName,
    status: importStatus[row.status],
    transactionCount: row.transactionCount,
    duplicateCount: row.duplicateCount,
    completedAt: row.completedAt,
    undoneAt: row.undoneAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeStatementLine(row: BankStatementLine) {
  return {
    object: 'bank-statement-line' as const,
    id: row.id,
    accountId: row.accountId,
    importId: row.importId,
    externalId: row.externalId,
    fingerprint: row.fingerprint,
    postedAt: row.postedAt,
    authorizedAt: row.authorizedAt,
    type: row.type === 'CREDIT' ? ('credit' as const) : ('debit' as const),
    amount: row.amount.toString(),
    currency: row.currency,
    description: row.description,
    payee: row.payee,
    reference: row.reference,
    bankCategory: row.bankCategory,
    runningBalance: row.runningBalance?.toString() ?? null,
    status: lineStatus[row.status],
    recognitionSource: row.recognitionSource
      ? recognitionSource[row.recognitionSource]
      : null,
    recognizedRuleId: row.recognizedRuleId,
    duplicateOfId: row.duplicateOfId,
    excludedAt: row.excludedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeStatementImportWithLines(
  row: BankStatementImport & { lines: BankStatementLine[] }
) {
  return {
    ...serializeStatementImport(row),
    lines: row.lines.map(serializeStatementLine),
  }
}

export function serializeStatementMatch(
  row: BankStatementMatch & { items: BankStatementMatchItem[] }
) {
  return {
    object: 'bank-statement-match' as const,
    id: row.id,
    statementLineId: row.statementLineId,
    status: matchStatus[row.status],
    matchedAt: row.matchedAt,
    reversedAt: row.reversedAt,
    items: row.items.map((item) => ({
      object: 'bank-statement-match-item' as const,
      id: item.id,
      bankTransactionId: item.bankTransactionId,
      amount: item.amount.toString(),
    })),
  }
}

export function serializeBankTransfer(row: BankTransfer) {
  return {
    object: 'bank-transfer' as const,
    id: row.id,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    amount: row.amount.toString(),
    currency: row.currency,
    transferredAt: row.transferredAt,
    description: row.description,
    reference: row.reference,
    status: transferStatus[row.status],
    reversedAt: row.reversedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeBankDeposit(
  row: BankDeposit & { items: Array<{ sourceTransactionId: string }> }
) {
  return {
    object: 'bank-deposit' as const,
    id: row.id,
    sourceAccountId: row.sourceAccountId,
    destinationAccountId: row.destinationAccountId,
    amount: row.amount.toString(),
    currency: row.currency,
    depositedAt: row.depositedAt,
    description: row.description,
    reference: row.reference,
    status: depositStatus[row.status],
    reversedAt: row.reversedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    transactionIds: row.items.map((item) => item.sourceTransactionId),
  }
}

export function serializeReconciliation(
  row: BankReconciliation & {
    items: Array<{ bankTransactionId: string }>
  }
) {
  return {
    object: 'bank-reconciliation' as const,
    id: row.id,
    accountId: row.accountId,
    startAt: row.startAt,
    endAt: row.endAt,
    openingBalance: row.openingBalance.toString(),
    closingBalance: row.closingBalance.toString(),
    clearedBalance: row.clearedBalance.toString(),
    difference: row.difference.toString(),
    status: reconciliationStatus[row.status],
    completedAt: row.completedAt,
    reopenedAt: row.reopenedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    bankTransactionIds: row.items.map((item) => item.bankTransactionId),
  }
}

type RuleRow = BankRule & {
  conditions: BankRuleCondition[]
  accounts: BankRuleAccount[]
}

export function serializeBankRule(row: RuleRow) {
  const action = row.action as {
    type: 'manual-deposit' | 'manual-withdrawal' | 'review'
    note?: string | null
  }

  return {
    object: 'bank-rule' as const,
    id: row.id,
    name: row.name,
    priority: row.priority,
    enabled: row.enabled,
    matchMode: row.matchMode === 'ALL' ? ('all' as const) : ('any' as const),
    automationMode:
      row.automationMode === 'RECOGNIZE'
        ? ('recognize' as const)
        : ('auto-categorize' as const),
    accountIds: row.accounts.map((account) => account.accountId),
    conditions: row.conditions.map((condition) => ({
      id: condition.id,
      field: ruleField[condition.field],
      operator: ruleOperator[condition.operator],
      value: condition.value,
    })),
    action,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
