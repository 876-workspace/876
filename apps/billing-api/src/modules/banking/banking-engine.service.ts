import { listObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { isUniqueConstraintError } from '@/platform/prisma-errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  matchConfidence,
  ruleMatches,
  scoreMatchCandidate,
  statementFingerprint,
} from './banking-engine.logic'
import * as repository from './banking-engine.repository'
import type {
  BankRuleCreateBody,
  BankRuleUpdateBody,
  BankTransferCreateBody,
  ReconciliationCreateBody,
  StatementImportCreateBody,
  StatementMatchBody,
} from './banking-engine.schemas'
import {
  serializeBankRule,
  serializeBankTransfer,
  serializeReconciliation,
  serializeStatementImport,
  serializeStatementImportWithLines,
  serializeStatementLine,
  serializeStatementMatch,
} from './banking-engine.serializers'

function missing(kind: string) {
  return new AppHttpError({
    code: `banking/${kind}-not-found`,
    message: `${kind.replaceAll('-', ' ')} not found.`,
    httpStatus: 404,
  })
}

function conflict(message: string) {
  return new AppHttpError({
    code: 'banking/invalid-state',
    message,
    httpStatus: 409,
  })
}

function invalid(message: string) {
  return new AppHttpError({
    code: 'validation/invalid-request',
    message,
    httpStatus: 422,
  })
}

async function requireAccount(tenantId: string, accountId: string) {
  const account = await repository.findEngineAccount(tenantId, accountId)
  if (!account) throw missing('bank-account')

  return account
}

/** Imports normalized external bank evidence without booking accounting cash. */
export async function createStatementImport(
  tenantId: string,
  accountId: string,
  body: StatementImportCreateBody,
  actorId: string | null
) {
  const account = await requireAccount(tenantId, accountId)
  if (!account.isActive) throw conflict('The bank account is archived.')
  if (body.lines.some((line) => line.currency !== account.currency))
    throw invalid('Every statement line must use the bank account currency.')

  const drafted = body.lines.map((line) => ({
    id: generateId('BankStatementLine'),
    line,
    fingerprint: statementFingerprint(accountId, line),
  }))
  const existing = await repository.findStatementDuplicateRows(
    tenantId,
    accountId,
    drafted.flatMap(({ line }) => (line.externalId ? [line.externalId] : [])),
    drafted.map(({ fingerprint }) => fingerprint)
  )
  const byExternalId = new Map(
    existing.flatMap((row) => (row.externalId ? [[row.externalId, row.id]] : []))
  )
  const byFingerprint = new Map(
    existing.map((row) => [row.fingerprint, row.id] as const)
  )

  const lines: repository.PreparedStatementLine[] = drafted.map(
    ({ id, line, fingerprint }) => {
      const duplicateOfId =
        (line.externalId ? byExternalId.get(line.externalId) : undefined) ??
        byFingerprint.get(fingerprint) ??
        null

      if (line.externalId && !byExternalId.has(line.externalId))
        byExternalId.set(line.externalId, id)
      if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, id)

      return {
        id,
        fingerprint,
        duplicateOfId,
        externalId: line.externalId ?? null,
        postedAt: line.postedAt,
        authorizedAt: line.authorizedAt ?? null,
        type: line.type === 'credit' ? 'CREDIT' : 'DEBIT',
        amount: line.amount,
        currency: line.currency,
        description: line.description ?? null,
        payee: line.payee ?? null,
        reference: line.reference ?? null,
        bankCategory: line.bankCategory ?? null,
        runningBalance: line.runningBalance ?? null,
      }
    }
  )

  const now = nowUnixSeconds()
  const row = await repository.createStatementImportRow(
    tenantId,
    accountId,
    generateId('BankStatementImport'),
    body,
    lines,
    actorId,
    now
  )
  await recognizeImportedLines(tenantId, accountId, row.lines, actorId, now)

  const refreshed = await repository.findStatementImportRow(tenantId, row.id)
  if (!refreshed) throw missing('statement-import')

  return serializeStatementImportWithLines(refreshed)
}

async function recognizeImportedLines(
  tenantId: string,
  accountId: string,
  lines: Awaited<ReturnType<typeof repository.createStatementImportRow>>['lines'],
  actorId: string | null,
  now: number
) {
  const rules = await repository.listActiveBankRuleRows(tenantId, accountId)
  if (!rules.length) return

  for (const line of lines) {
    if (line.duplicateOfId) continue

    const rule = rules.find((candidate) => ruleMatches(line, candidate))
    if (!rule) continue

    await repository.recognizeStatementLineRow(tenantId, line.id, rule.id, now)
    if (rule.automationMode !== 'AUTO_CATEGORIZE') continue

    const action = rule.action as {
      type: 'manual-deposit' | 'manual-withdrawal' | 'review'
    }
    const directionMatches =
      (action.type === 'manual-deposit' && line.type === 'CREDIT') ||
      (action.type === 'manual-withdrawal' && line.type === 'DEBIT')
    if (!directionMatches) continue

    await repository.createManualCategorizationRows(
      tenantId,
      line,
      generateId('BankTransaction'),
      generateId('BankStatementMatch'),
      generateId('BankStatementMatchItem'),
      actorId,
      now
    )
  }
}

export async function listStatementImports(
  tenantId: string,
  accountId: string
) {
  await requireAccount(tenantId, accountId)
  const rows = await repository.listStatementImportRows(tenantId, accountId)

  return listObject({
    data: rows.map(serializeStatementImport),
    hasMore: false,
    totalCount: rows.length,
    url: `/api/v1/banking/accounts/${accountId}/statement-imports`,
  })
}

export async function retrieveStatementImport(
  tenantId: string,
  importId: string
) {
  const row = await repository.findStatementImportRow(tenantId, importId)
  if (!row) throw missing('statement-import')

  return serializeStatementImportWithLines(row)
}

export async function undoStatementImport(
  tenantId: string,
  importId: string
) {
  const result = await repository.undoStatementImportRow(
    tenantId,
    importId,
    nowUnixSeconds()
  )
  if (result.kind === 'missing') throw missing('statement-import')
  if (result.kind === 'in-use')
    throw conflict(
      'Unmatch or uncategorize every resolved statement line before undoing this import.'
    )
  if (result.kind === 'already-undone')
    throw conflict('This statement import has already been undone.')

  return serializeStatementImport(result.row)
}

export async function listStatementLines(
  tenantId: string,
  accountId: string
) {
  await requireAccount(tenantId, accountId)
  const rows = await repository.listStatementLineRows(tenantId, accountId)

  return listObject({
    data: rows.map(serializeStatementLine),
    hasMore: false,
    totalCount: rows.length,
    url: `/api/v1/banking/accounts/${accountId}/statement-lines`,
  })
}

export async function retrieveStatementLine(tenantId: string, lineId: string) {
  const row = await repository.findStatementLineRow(tenantId, lineId)
  if (!row) throw missing('statement-line')

  return serializeStatementLine(row)
}

export async function listMatchCandidates(tenantId: string, lineId: string) {
  const line = await repository.findStatementLineRow(tenantId, lineId)
  if (!line) throw missing('statement-line')
  if (line.status === 'EXCLUDED')
    throw conflict('Restore this statement line before matching it.')

  const rows = await repository.listMatchCandidateRows(
    tenantId,
    line.accountId,
    line.type,
    Math.max(0, line.postedAt - 14 * 86_400),
    line.postedAt + 14 * 86_400
  )
  const candidates = rows
    .map((row) => {
      const matched = row.statementMatchItems.reduce(
        (total, item) => total + item.amount,
        0n
      )
      const availableAmount = row.amount - matched
      const score = scoreMatchCandidate(line, { ...row, availableAmount })

      return {
        object: 'bank-match-candidate' as const,
        bankTransactionId: row.id,
        paymentId: row.paymentId,
        type: row.type === 'CREDIT' ? ('credit' as const) : ('debit' as const),
        amount: row.amount.toString(),
        availableAmount: availableAmount.toString(),
        date: row.date,
        description: row.description,
        reference: row.reference,
        score,
        confidence: matchConfidence(score),
      }
    })
    .filter((candidate) => candidate.score >= 40)
    .sort((left, right) => right.score - left.score)

  return listObject({
    data: candidates,
    hasMore: false,
    totalCount: candidates.length,
    url: `/api/v1/banking/statement-lines/${lineId}/matches`,
  })
}

export async function matchStatementLine(
  tenantId: string,
  lineId: string,
  body: StatementMatchBody,
  actorId: string | null
) {
  const line = await repository.findStatementLineRow(tenantId, lineId)
  if (!line) throw missing('statement-line')
  if (!['UNCATEGORIZED', 'RECOGNIZED'].includes(line.status))
    throw conflict('Only unresolved statement lines can be matched.')

  const ids = body.items.map((item) => item.bankTransactionId)
  if (new Set(ids).size !== ids.length)
    throw invalid('Each bank transaction can appear only once in a match.')

  const transactions = await repository.findMatchTransactionRows(
    tenantId,
    line.accountId,
    ids
  )
  if (transactions.length !== ids.length)
    throw invalid('One or more bank transactions were not found on this account.')

  const transactionsById = new Map(transactions.map((row) => [row.id, row]))
  for (const item of body.items) {
    const transaction = transactionsById.get(item.bankTransactionId)
    if (!transaction) throw invalid('A selected bank transaction was not found.')
    if (transaction.type !== line.type)
      throw invalid('Matched transactions must use the statement direction.')

    const matched = transaction.statementMatchItems.reduce(
      (total, matchItem) => total + matchItem.amount,
      0n
    )
    if (item.amount > transaction.amount - matched)
      throw invalid('A match cannot exceed the transaction amount still available.')
  }

  const total = body.items.reduce((sum, item) => sum + item.amount, 0n)
  if (total !== line.amount)
    throw invalid('Matched amounts must equal the statement line amount.')

  const row = await repository.createStatementMatchRow(
    tenantId,
    lineId,
    generateId('BankStatementMatch'),
    body.items.map((item) => ({
      ...item,
      id: generateId('BankStatementMatchItem'),
    })),
    actorId,
    nowUnixSeconds()
  )
  if (!row)
    throw conflict(
      'The statement line or selected transaction balance changed while matching.'
    )

  return serializeStatementMatch(row)
}

export async function unmatchStatementLine(
  tenantId: string,
  lineId: string,
  actorId: string | null
) {
  if (!(await repository.findStatementLineRow(tenantId, lineId)))
    throw missing('statement-line')

  const row = await repository.reverseStatementMatchRow(
    tenantId,
    lineId,
    actorId,
    nowUnixSeconds()
  )
  if (!row) throw conflict('This statement line has no active match.')

  return serializeStatementMatch(row)
}

export async function excludeStatementLine(tenantId: string, lineId: string) {
  if (!(await repository.findStatementLineRow(tenantId, lineId)))
    throw missing('statement-line')

  const result = await repository.excludeStatementLineRow(
    tenantId,
    lineId,
    nowUnixSeconds()
  )
  if (result.count !== 1)
    throw conflict('Only unresolved statement lines can be excluded.')

  return retrieveStatementLine(tenantId, lineId)
}

export async function restoreStatementLine(tenantId: string, lineId: string) {
  if (!(await repository.findStatementLineRow(tenantId, lineId)))
    throw missing('statement-line')

  const result = await repository.restoreStatementLineRow(
    tenantId,
    lineId,
    nowUnixSeconds()
  )
  if (result.count !== 1)
    throw conflict('Only excluded statement lines can be restored.')

  return retrieveStatementLine(tenantId, lineId)
}

export async function categorizeManualStatementLine(
  tenantId: string,
  lineId: string,
  action: 'manual-deposit' | 'manual-withdrawal',
  actorId: string | null
) {
  const line = await repository.findStatementLineRow(tenantId, lineId)
  if (!line) throw missing('statement-line')
  if (!['UNCATEGORIZED', 'RECOGNIZED'].includes(line.status))
    throw conflict('Only unresolved statement lines can be categorized.')
  if (action === 'manual-deposit' && line.type !== 'CREDIT')
    throw invalid('A manual deposit must categorize a credit statement line.')
  if (action === 'manual-withdrawal' && line.type !== 'DEBIT')
    throw invalid('A manual withdrawal must categorize a debit statement line.')

  const result = await repository.createManualCategorizationRows(
    tenantId,
    line,
    generateId('BankTransaction'),
    generateId('BankStatementMatch'),
    generateId('BankStatementMatchItem'),
    actorId,
    nowUnixSeconds()
  )
  if (!result)
    throw conflict('The statement line changed while it was being categorized.')

  return {
    statementLine: await retrieveStatementLine(tenantId, lineId),
    match: serializeStatementMatch(result.match),
    bankTransactionId: result.transaction.id,
  }
}

export async function listBankTransfers(tenantId: string) {
  const rows = await repository.listTransferRows(tenantId)

  return listObject({
    data: rows.map(serializeBankTransfer),
    hasMore: false,
    totalCount: rows.length,
    url: '/api/v1/banking/transfers',
  })
}

export async function createBankTransfer(
  tenantId: string,
  body: BankTransferCreateBody
) {
  if (body.fromAccountId === body.toAccountId)
    throw invalid('A transfer requires two different bank accounts.')

  const [from, to] = await Promise.all([
    requireAccount(tenantId, body.fromAccountId),
    requireAccount(tenantId, body.toAccountId),
  ])
  if (!from.isActive || !to.isActive)
    throw conflict('Both transfer accounts must be active.')
  if (from.currency !== body.currency || to.currency !== body.currency)
    throw invalid('Both transfer accounts must use the transfer currency.')

  return serializeBankTransfer(
    await repository.createTransferRows(
      tenantId,
      generateId('BankTransfer'),
      generateId('BankTransaction'),
      generateId('BankTransaction'),
      body,
      nowUnixSeconds()
    )
  )
}

export async function listReconciliations(
  tenantId: string,
  accountId: string
) {
  await requireAccount(tenantId, accountId)
  const rows = await repository.listReconciliationRows(tenantId, accountId)

  return listObject({
    data: rows.map(serializeReconciliation),
    hasMore: false,
    totalCount: rows.length,
    url: `/api/v1/banking/accounts/${accountId}/reconciliations`,
  })
}

export async function retrieveReconciliation(tenantId: string, id: string) {
  const row = await repository.findReconciliationRow(tenantId, id)
  if (!row) throw missing('reconciliation')

  return serializeReconciliation(row)
}

export async function createReconciliation(
  tenantId: string,
  accountId: string,
  body: ReconciliationCreateBody,
  actorId: string | null
) {
  await requireAccount(tenantId, accountId)
  const ids = body.bankTransactionIds
  if (new Set(ids).size !== ids.length)
    throw invalid('Each bank transaction can be reconciled only once per draft.')

  const transactions = await repository.findReconciliationTransactionRows(
    tenantId,
    accountId,
    ids
  )
  if (transactions.length !== ids.length)
    throw invalid('One or more reconciliation transactions were not found.')
  if (
    transactions.some(
      (transaction) =>
        transaction.date < body.startAt || transaction.date > body.endAt
    )
  )
    throw invalid(
      'Every reconciled transaction must fall within the statement period.'
    )
  if (transactions.some((transaction) => transaction.reconciliationItems.length > 0))
    throw conflict(
      'One or more transactions are already in a completed reconciliation.'
    )

  const movement = transactions.reduce(
    (total, transaction) =>
      total +
      (transaction.type === 'CREDIT' ? transaction.amount : -transaction.amount),
    0n
  )
  const clearedBalance = body.openingBalance + movement
  const difference = body.closingBalance - clearedBalance
  const now = nowUnixSeconds()
  const row = await repository.createReconciliationRow({
    id: generateId('BankReconciliation'),
    tenantId,
    accountId,
    startAt: body.startAt,
    endAt: body.endAt,
    openingBalance: body.openingBalance,
    closingBalance: body.closingBalance,
    clearedBalance,
    difference,
    bankTransactions: transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      itemId: generateId('BankReconciliationItem'),
    })),
    createdBy: actorId,
    now,
  })

  return serializeReconciliation(row)
}

export async function completeReconciliation(
  tenantId: string,
  id: string,
  actorId: string | null
) {
  const current = await repository.findReconciliationRow(tenantId, id)
  if (!current) throw missing('reconciliation')
  if (current.difference !== 0n)
    throw conflict(
      'A reconciliation can complete only when its difference is zero.'
    )

  const result = await repository.completeReconciliationRow(
    tenantId,
    id,
    actorId,
    nowUnixSeconds()
  )
  if (result.count !== 1)
    throw conflict('Only a draft or reopened reconciliation can be completed.')

  return retrieveReconciliation(tenantId, id)
}

export async function reopenReconciliation(
  tenantId: string,
  id: string,
  actorId: string | null
) {
  const current = await repository.findReconciliationRow(tenantId, id)
  if (!current) throw missing('reconciliation')
  if (current.status !== 'COMPLETED')
    throw conflict('Only a completed reconciliation can be reopened.')

  const later = await repository.findLaterCompletedReconciliationRow(
    tenantId,
    current.accountId,
    current.endAt,
    current.id
  )
  if (later)
    throw conflict(
      `Reopen the later reconciliation ${later.id} before reopening this period.`
    )

  const result = await repository.reopenReconciliationRow(
    tenantId,
    id,
    actorId,
    nowUnixSeconds()
  )
  if (result.count !== 1)
    throw conflict('The reconciliation changed while it was being reopened.')

  return retrieveReconciliation(tenantId, id)
}

export async function listBankRules(tenantId: string) {
  const rows = await repository.listBankRuleRows(tenantId)

  return listObject({
    data: rows.map(serializeBankRule),
    hasMore: false,
    totalCount: rows.length,
    url: '/api/v1/banking/rules',
  })
}

export async function retrieveBankRule(tenantId: string, id: string) {
  const row = await repository.findBankRuleRow(tenantId, id)
  if (!row) throw missing('bank-rule')

  return serializeBankRule(row)
}

async function validateRuleAccounts(tenantId: string, accountIds: string[]) {
  for (const accountId of accountIds)
    if (!(await repository.findEngineAccount(tenantId, accountId)))
      throw invalid('Every rule account must belong to this organization.')
}

function validateRuleAutomation(body: {
  automationMode?: 'recognize' | 'auto-categorize'
  action?: { type: 'manual-deposit' | 'manual-withdrawal' | 'review' }
}) {
  if (
    body.automationMode === 'auto-categorize' &&
    (!body.action || body.action.type === 'review')
  )
    throw invalid('Auto-categorize rules require a supported accounting action.')
}

export async function createBankRule(
  tenantId: string,
  body: BankRuleCreateBody,
  actorId: string | null
) {
  await validateRuleAccounts(tenantId, body.accountIds)
  validateRuleAutomation(body)

  try {
    return serializeBankRule(
      await repository.createBankRuleRow(
        tenantId,
        generateId('BankRule'),
        body,
        body.conditions.map(() => generateId('BankRuleCondition')),
        actorId,
        nowUnixSeconds()
      )
    )
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw conflict('A bank rule with this name already exists.')
    throw error
  }
}

export async function updateBankRule(
  tenantId: string,
  id: string,
  body: BankRuleUpdateBody
) {
  const current = await repository.findBankRuleRow(tenantId, id)
  if (!current) throw missing('bank-rule')
  if (body.accountIds) await validateRuleAccounts(tenantId, body.accountIds)
  validateRuleAutomation({
    automationMode:
      body.automationMode ??
      (current.automationMode === 'AUTO_CATEGORIZE'
        ? 'auto-categorize'
        : 'recognize'),
    action:
      body.action ??
      (current.action as {
        type: 'manual-deposit' | 'manual-withdrawal' | 'review'
      }),
  })

  try {
    const row = await repository.updateBankRuleRow(
      tenantId,
      id,
      body,
      (body.conditions ?? []).map(() => generateId('BankRuleCondition')),
      nowUnixSeconds()
    )
    if (!row) throw missing('bank-rule')

    return serializeBankRule(row)
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw conflict('A bank rule with this name already exists.')
    throw error
  }
}

export async function deleteBankRule(tenantId: string, id: string) {
  if (!(await repository.findBankRuleRow(tenantId, id)))
    throw missing('bank-rule')
  if ((await repository.countRecognizedRuleLines(tenantId, id)) > 0)
    throw conflict(
      'A rule used as statement recognition evidence cannot be deleted.'
    )

  await repository.deleteBankRuleRow(tenantId, id)

  return { object: 'bank-rule' as const, id, deleted: true as const }
}
