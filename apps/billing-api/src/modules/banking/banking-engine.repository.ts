import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type {
  BankRuleCreateBody,
  BankRuleUpdateBody,
  BankTransferCreateBody,
  StatementImportCreateBody,
} from './banking-engine.schemas'

export interface PreparedStatementLine {
  id: string
  fingerprint: string
  duplicateOfId: string | null
  externalId: string | null
  postedAt: number
  authorizedAt: number | null
  type: 'CREDIT' | 'DEBIT'
  amount: bigint
  currency: string
  description: string | null
  payee: string | null
  reference: string | null
  bankCategory: string | null
  runningBalance: bigint | null
}

export interface PreparedMatchItem {
  id: string
  bankTransactionId: string
  amount: bigint
}

const ruleInclude = {
  conditions: { orderBy: { createdAt: 'asc' as const } },
  accounts: { orderBy: { accountId: 'asc' as const } },
} as const

export function findEngineAccount(tenantId: string, accountId: string) {
  return prisma.bankAccount.findFirst({
    where: { tenantId, id: accountId },
    select: {
      id: true,
      currency: true,
      accountType: true,
      openingBalance: true,
      isActive: true,
    },
  })
}

export function findStatementDuplicateRows(
  tenantId: string,
  accountId: string,
  externalIds: string[],
  fingerprints: string[]
) {
  const alternatives: Prisma.BankStatementLineWhereInput[] = []
  if (externalIds.length) alternatives.push({ externalId: { in: externalIds } })
  if (fingerprints.length)
    alternatives.push({ fingerprint: { in: fingerprints } })
  if (!alternatives.length) return Promise.resolve([])

  return prisma.bankStatementLine.findMany({
    where: { tenantId, accountId, OR: alternatives },
    select: { id: true, externalId: true, fingerprint: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export function createStatementImportRow(
  tenantId: string,
  accountId: string,
  id: string,
  body: StatementImportCreateBody,
  lines: PreparedStatementLine[],
  importedBy: string | null,
  now: number
) {
  const duplicateCount = lines.filter((line) => line.duplicateOfId).length

  return prisma.bankStatementImport.create({
    data: {
      id,
      tenantId,
      accountId,
      source: body.source.toUpperCase() as 'FILE' | 'EMAIL' | 'FEED' | 'API',
      format: body.format
        ? (body.format.replace('-', '_').toUpperCase() as
            | 'CSV'
            | 'TSV'
            | 'OFX'
            | 'QIF'
            | 'CAMT_053'
            | 'CAMT_054'
            | 'MT940')
        : null,
      sourceFileId: body.sourceFileId ?? null,
      sourceName: body.sourceName ?? null,
      mapping: (body.mapping ?? undefined) as Prisma.InputJsonValue | undefined,
      status: 'COMPLETED',
      importedBy,
      transactionCount: lines.length,
      duplicateCount,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
      lines: {
        create: lines.map((line) => ({
          ...line,
          tenantId,
          accountId,
          status: 'UNCATEGORIZED' as const,
          createdAt: now,
          updatedAt: now,
        })),
      },
    },
    include: { lines: { orderBy: [{ postedAt: 'desc' }, { id: 'desc' }] } },
  })
}

export function listStatementImportRows(tenantId: string, accountId: string) {
  return prisma.bankStatementImport.findMany({
    where: { tenantId, accountId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
  })
}

export function findStatementImportRow(tenantId: string, importId: string) {
  return prisma.bankStatementImport.findFirst({
    where: { tenantId, id: importId },
    include: { lines: { orderBy: [{ postedAt: 'desc' }, { id: 'desc' }] } },
  })
}

export async function undoStatementImportRow(
  tenantId: string,
  importId: string,
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.bankStatementImport.findFirst({
      where: { tenantId, id: importId },
      include: {
        lines: {
          select: {
            id: true,
            status: true,
            matches: {
              where: { status: 'ACTIVE' },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    })
    if (!record) return { kind: 'missing' as const }
    if (record.status === 'UNDONE') return { kind: 'already-undone' as const }

    const blocked = record.lines.some(
      (line) =>
        line.status === 'MATCHED' ||
        line.status === 'CATEGORIZED' ||
        line.matches.length > 0
    )
    if (blocked) return { kind: 'in-use' as const }

    await tx.bankStatementLine.updateMany({
      where: { tenantId, importId },
      data: { status: 'EXCLUDED', excludedAt: now, updatedAt: now },
    })
    const updated = await tx.bankStatementImport.update({
      where: { id: importId },
      data: { status: 'UNDONE', undoneAt: now, updatedAt: now },
    })

    return { kind: 'updated' as const, row: updated }
  })
}

export function listStatementLineRows(tenantId: string, accountId: string) {
  return prisma.bankStatementLine.findMany({
    where: { tenantId, accountId },
    orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  })
}

export function findStatementLineRow(tenantId: string, lineId: string) {
  return prisma.bankStatementLine.findFirst({ where: { tenantId, id: lineId } })
}

export function listMatchCandidateRows(
  tenantId: string,
  accountId: string,
  type: 'CREDIT' | 'DEBIT',
  fromDate: number,
  toDate: number
) {
  return prisma.bankTransaction.findMany({
    where: {
      tenantId,
      accountId,
      type,
      status: { not: 'EXCLUDED' },
      date: { gte: fromDate, lte: toDate },
    },
    include: {
      statementMatchItems: {
        where: { match: { status: 'ACTIVE' } },
        select: { amount: true },
      },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
}

export function findMatchTransactionRows(
  tenantId: string,
  accountId: string,
  ids: string[]
) {
  return prisma.bankTransaction.findMany({
    where: { tenantId, accountId, id: { in: ids } },
    include: {
      statementMatchItems: {
        where: { match: { status: 'ACTIVE' } },
        select: { amount: true },
      },
    },
  })
}

export function findActiveStatementMatchRow(tenantId: string, lineId: string) {
  return prisma.bankStatementMatch.findFirst({
    where: { tenantId, statementLineId: lineId, status: 'ACTIVE' },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function createStatementMatchRow(
  tenantId: string,
  lineId: string,
  matchId: string,
  items: PreparedMatchItem[],
  matchedBy: string | null,
  now: number,
  lineStatus: 'MATCHED' | 'CATEGORIZED' = 'MATCHED'
) {
  return prisma.$transaction(
    async (tx) => {
      const line = await tx.bankStatementLine.findFirst({
        where: {
          tenantId,
          id: lineId,
          status: { in: ['UNCATEGORIZED', 'RECOGNIZED'] },
        },
        select: { id: true, accountId: true, type: true, amount: true },
      })
      if (!line) return null

      const ids = items.map((item) => item.bankTransactionId)
      const transactions = await tx.bankTransaction.findMany({
        where: { tenantId, accountId: line.accountId, id: { in: ids } },
        include: {
          statementMatchItems: {
            where: { match: { status: 'ACTIVE' } },
            select: { amount: true },
          },
        },
      })
      if (transactions.length !== ids.length) return null

      const transactionsById = new Map(
        transactions.map((transaction) => [transaction.id, transaction])
      )
      for (const item of items) {
        const transaction = transactionsById.get(item.bankTransactionId)
        if (!transaction || transaction.type !== line.type) return null

        const matched = transaction.statementMatchItems.reduce(
          (total, matchItem) => total + matchItem.amount,
          0n
        )
        if (item.amount > transaction.amount - matched) return null
      }
      if (items.reduce((total, item) => total + item.amount, 0n) !== line.amount)
        return null

      const updated = await tx.bankStatementLine.updateMany({
        where: {
          tenantId,
          id: lineId,
          status: { in: ['UNCATEGORIZED', 'RECOGNIZED'] },
        },
        data: { status: lineStatus, excludedAt: null, updatedAt: now },
      })
      if (updated.count !== 1) return null

      return tx.bankStatementMatch.create({
        data: {
          id: matchId,
          tenantId,
          statementLineId: lineId,
          status: 'ACTIVE',
          matchedBy,
          matchedAt: now,
          createdAt: now,
          updatedAt: now,
          items: {
            create: items.map((item) => ({
              id: item.id,
              tenantId,
              bankTransactionId: item.bankTransactionId,
              amount: item.amount,
              createdAt: now,
            })),
          },
        },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    },
    { isolationLevel: 'Serializable' }
  )
}

export async function reverseStatementMatchRow(
  tenantId: string,
  lineId: string,
  reversedBy: string | null,
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.bankStatementMatch.findFirst({
      where: { tenantId, statementLineId: lineId, status: 'ACTIVE' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    if (!current) return null

    const match = await tx.bankStatementMatch.update({
      where: { id: current.id },
      data: { status: 'REVERSED', reversedBy, reversedAt: now, updatedAt: now },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    await tx.bankStatementLine.updateMany({
      where: { tenantId, id: lineId },
      data: { status: 'UNCATEGORIZED', updatedAt: now },
    })

    return match
  })
}

export function excludeStatementLineRow(
  tenantId: string,
  lineId: string,
  now: number
) {
  return prisma.bankStatementLine.updateMany({
    where: {
      tenantId,
      id: lineId,
      status: { in: ['UNCATEGORIZED', 'RECOGNIZED'] },
    },
    data: { status: 'EXCLUDED', excludedAt: now, updatedAt: now },
  })
}

export function restoreStatementLineRow(
  tenantId: string,
  lineId: string,
  now: number
) {
  return prisma.bankStatementLine.updateMany({
    where: { tenantId, id: lineId, status: 'EXCLUDED' },
    data: { status: 'UNCATEGORIZED', excludedAt: null, updatedAt: now },
  })
}

export async function createManualCategorizationRows(
  tenantId: string,
  line: {
    id: string
    accountId: string
    type: 'CREDIT' | 'DEBIT'
    amount: bigint
    postedAt: number
    description: string | null
    reference: string | null
  },
  bankTransactionId: string,
  matchId: string,
  matchItemId: string,
  actorId: string | null,
  now: number
) {
  return prisma.$transaction(
    async (tx) => {
      const updated = await tx.bankStatementLine.updateMany({
        where: {
          tenantId,
          id: line.id,
          status: { in: ['UNCATEGORIZED', 'RECOGNIZED'] },
        },
        data: { status: 'CATEGORIZED', excludedAt: null, updatedAt: now },
      })
      if (updated.count !== 1) return null

      const transaction = await tx.bankTransaction.create({
        data: {
          id: bankTransactionId,
          tenantId,
          accountId: line.accountId,
          type: line.type,
          amount: line.amount,
          date: line.postedAt,
          description: line.description,
          status: 'CATEGORIZED',
          reference: line.reference,
          createdAt: now,
          updatedAt: now,
        },
      })
      const match = await tx.bankStatementMatch.create({
        data: {
          id: matchId,
          tenantId,
          statementLineId: line.id,
          status: 'ACTIVE',
          matchedBy: actorId,
          matchedAt: now,
          createdAt: now,
          updatedAt: now,
          items: {
            create: {
              id: matchItemId,
              tenantId,
              bankTransactionId,
              amount: line.amount,
              createdAt: now,
            },
          },
        },
        include: { items: true },
      })

      return { transaction, match }
    },
    { isolationLevel: 'Serializable' }
  )
}

export function listTransferRows(tenantId: string) {
  return prisma.bankTransfer.findMany({
    where: { tenantId },
    orderBy: [{ transferredAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
}

export function createTransferRows(
  tenantId: string,
  id: string,
  debitId: string,
  creditId: string,
  body: BankTransferCreateBody,
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.create({
      data: {
        id,
        tenantId,
        ...body,
        description: body.description ?? null,
        reference: body.reference ?? null,
        status: 'POSTED',
        createdAt: now,
        updatedAt: now,
      },
    })
    await tx.bankTransaction.createMany({
      data: [
        {
          id: debitId,
          tenantId,
          accountId: body.fromAccountId,
          transferId: id,
          type: 'DEBIT',
          amount: body.amount,
          date: body.transferredAt,
          description: body.description ?? 'Bank transfer',
          status: 'CATEGORIZED',
          reference: body.reference ?? id,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: creditId,
          tenantId,
          accountId: body.toAccountId,
          transferId: id,
          type: 'CREDIT',
          amount: body.amount,
          date: body.transferredAt,
          description: body.description ?? 'Bank transfer',
          status: 'CATEGORIZED',
          reference: body.reference ?? id,
          createdAt: now,
          updatedAt: now,
        },
      ],
    })

    return transfer
  })
}

export function listReconciliationRows(tenantId: string, accountId: string) {
  return prisma.bankReconciliation.findMany({
    where: { tenantId, accountId },
    include: { items: { select: { bankTransactionId: true } } },
    orderBy: [{ endAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
}

export function findReconciliationRow(tenantId: string, id: string) {
  return prisma.bankReconciliation.findFirst({
    where: { tenantId, id },
    include: { items: { select: { bankTransactionId: true } } },
  })
}

export function findReconciliationTransactionRows(
  tenantId: string,
  accountId: string,
  ids: string[]
) {
  return prisma.bankTransaction.findMany({
    where: { tenantId, accountId, id: { in: ids }, status: { not: 'EXCLUDED' } },
    include: {
      reconciliationItems: {
        where: { reconciliation: { status: 'COMPLETED' } },
        select: { reconciliationId: true },
      },
    },
  })
}

export function createReconciliationRow(data: {
  id: string
  tenantId: string
  accountId: string
  startAt: number
  endAt: number
  openingBalance: bigint
  closingBalance: bigint
  clearedBalance: bigint
  difference: bigint
  bankTransactions: Array<{ id: string; amount: bigint; itemId: string }>
  createdBy: string | null
  now: number
}) {
  return prisma.bankReconciliation.create({
    data: {
      id: data.id,
      tenantId: data.tenantId,
      accountId: data.accountId,
      startAt: data.startAt,
      endAt: data.endAt,
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance,
      clearedBalance: data.clearedBalance,
      difference: data.difference,
      status: 'DRAFT',
      createdBy: data.createdBy,
      createdAt: data.now,
      updatedAt: data.now,
      items: {
        create: data.bankTransactions.map((transaction) => ({
          id: transaction.itemId,
          tenantId: data.tenantId,
          bankTransactionId: transaction.id,
          amount: transaction.amount,
          createdAt: data.now,
        })),
      },
    },
    include: { items: { select: { bankTransactionId: true } } },
  })
}

export function completeReconciliationRow(
  tenantId: string,
  id: string,
  completedBy: string | null,
  now: number
) {
  return prisma.bankReconciliation.updateMany({
    where: {
      tenantId,
      id,
      status: { in: ['DRAFT', 'REOPENED'] },
      difference: 0,
    },
    data: { status: 'COMPLETED', completedBy, completedAt: now, updatedAt: now },
  })
}

export function findLaterCompletedReconciliationRow(
  tenantId: string,
  accountId: string,
  endAt: number,
  id: string
) {
  return prisma.bankReconciliation.findFirst({
    where: {
      tenantId,
      accountId,
      status: 'COMPLETED',
      endAt: { gt: endAt },
      id: { not: id },
    },
    select: { id: true, endAt: true },
    orderBy: { endAt: 'asc' },
  })
}

export function reopenReconciliationRow(
  tenantId: string,
  id: string,
  reopenedBy: string | null,
  now: number
) {
  return prisma.bankReconciliation.updateMany({
    where: { tenantId, id, status: 'COMPLETED' },
    data: { status: 'REOPENED', reopenedBy, reopenedAt: now, updatedAt: now },
  })
}

export function listBankRuleRows(tenantId: string) {
  return prisma.bankRule.findMany({
    where: { tenantId },
    include: ruleInclude,
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    take: 100,
  })
}

export function listActiveBankRuleRows(tenantId: string, accountId: string) {
  return prisma.bankRule.findMany({
    where: {
      tenantId,
      enabled: true,
      OR: [{ accounts: { none: {} } }, { accounts: { some: { accountId } } }],
    },
    include: ruleInclude,
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    take: 100,
  })
}

export function findBankRuleRow(tenantId: string, id: string) {
  return prisma.bankRule.findFirst({
    where: { tenantId, id },
    include: ruleInclude,
  })
}

function conditionData(
  tenantId: string,
  ruleId: string,
  conditions: BankRuleCreateBody['conditions'],
  ids: string[],
  now: number
) {
  return conditions.map((condition, index) => ({
    id: ids[index],
    tenantId,
    ruleId,
    field: condition.field.replace('-', '_').toUpperCase() as
      | 'DESCRIPTION'
      | 'PAYEE'
      | 'REFERENCE'
      | 'AMOUNT'
      | 'TYPE',
    operator: condition.operator.replaceAll('-', '_').toUpperCase() as
      | 'EQUALS'
      | 'CONTAINS'
      | 'STARTS_WITH'
      | 'ENDS_WITH'
      | 'GREATER_THAN'
      | 'LESS_THAN',
    value: condition.value,
    createdAt: now,
  }))
}

export function createBankRuleRow(
  tenantId: string,
  id: string,
  body: BankRuleCreateBody,
  conditionIds: string[],
  createdBy: string | null,
  now: number
) {
  return prisma.bankRule.create({
    data: {
      id,
      tenantId,
      name: body.name,
      priority: body.priority,
      enabled: body.enabled,
      matchMode: body.matchMode.toUpperCase() as 'ALL' | 'ANY',
      automationMode: body.automationMode.replace('-', '_').toUpperCase() as
        | 'RECOGNIZE'
        | 'AUTO_CATEGORIZE',
      action: body.action as Prisma.InputJsonValue,
      createdBy,
      createdAt: now,
      updatedAt: now,
      conditions: {
        create: conditionData(tenantId, id, body.conditions, conditionIds, now),
      },
      accounts: {
        create: body.accountIds.map((accountId) => ({ tenantId, accountId })),
      },
    },
    include: ruleInclude,
  })
}

export async function updateBankRuleRow(
  tenantId: string,
  id: string,
  body: BankRuleUpdateBody,
  conditionIds: string[],
  now: number
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.bankRule.findFirst({
      where: { tenantId, id },
      include: ruleInclude,
    })
    if (!current) return null

    if (body.conditions) {
      await tx.bankRuleCondition.deleteMany({ where: { tenantId, ruleId: id } })
      await tx.bankRuleCondition.createMany({
        data: conditionData(tenantId, id, body.conditions, conditionIds, now),
      })
    }
    if (body.accountIds) {
      await tx.bankRuleAccount.deleteMany({ where: { tenantId, ruleId: id } })
      if (body.accountIds.length)
        await tx.bankRuleAccount.createMany({
          data: body.accountIds.map((accountId) => ({
            tenantId,
            ruleId: id,
            accountId,
          })),
        })
    }

    await tx.bankRule.update({
      where: { id },
      data: {
        name: body.name,
        priority: body.priority,
        enabled: body.enabled,
        matchMode: body.matchMode
          ? (body.matchMode.toUpperCase() as 'ALL' | 'ANY')
          : undefined,
        automationMode: body.automationMode
          ? (body.automationMode.replace('-', '_').toUpperCase() as
              | 'RECOGNIZE'
              | 'AUTO_CATEGORIZE')
          : undefined,
        action: body.action as Prisma.InputJsonValue | undefined,
        updatedAt: now,
      },
    })

    return tx.bankRule.findFirst({
      where: { tenantId, id },
      include: ruleInclude,
    })
  })
}

export function countRecognizedRuleLines(tenantId: string, ruleId: string) {
  return prisma.bankStatementLine.count({
    where: { tenantId, recognizedRuleId: ruleId },
  })
}

export async function deleteBankRuleRow(tenantId: string, id: string) {
  const result = await prisma.bankRule.deleteMany({ where: { tenantId, id } })
  return result.count > 0
}

export function recognizeStatementLineRow(
  tenantId: string,
  lineId: string,
  ruleId: string,
  now: number
) {
  return prisma.bankStatementLine.updateMany({
    where: { tenantId, id: lineId, status: 'UNCATEGORIZED' },
    data: {
      status: 'RECOGNIZED',
      recognitionSource: 'RULE',
      recognizedRuleId: ruleId,
      updatedAt: now,
    },
  })
}
