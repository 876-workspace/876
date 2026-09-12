import { prisma } from '@/db/client'
import type {
  BankAccountCreateBody,
  BankAccountUpdateBody,
  BankTransactionCreateBody,
  BankTransactionUpdateBody,
} from './banking.schemas'

export async function listBankAccountRows(tenantId: string) {
  const [accounts, totals] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 100,
    }),
    prisma.bankTransaction.groupBy({
      by: ['accountId', 'type'],
      where: { tenantId, status: { not: 'EXCLUDED' } },
      _sum: { amount: true },
    }),
  ])
  const movements = new Map<string, bigint>()
  for (const total of totals) {
    const amount = total._sum.amount ?? 0n
    movements.set(
      total.accountId,
      (movements.get(total.accountId) ?? 0n) +
        (total.type === 'CREDIT' ? amount : -amount)
    )
  }

  return accounts.map((account) => ({
    ...account,
    balance: account.openingBalance + (movements.get(account.id) ?? 0n),
  }))
}

export async function ensureSystemBankAccounts(tenantId: string, now: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true },
  })
  if (!tenant) return
  for (const definition of [
    {
      accountType: 'UNDEPOSITED_FUNDS' as const,
      baseName: 'Undeposited Funds',
      id: `system_${tenantId}_undeposited_funds`,
    },
    {
      accountType: 'PETTY_CASH' as const,
      baseName: 'Petty Cash',
      id: `system_${tenantId}_petty_cash`,
    },
  ]) {
    const existing = await prisma.bankAccount.findFirst({
      where: { tenantId, accountType: definition.accountType, isSystem: true },
      select: { id: true },
    })
    if (existing) continue

    for (let suffix = 0; suffix <= 1_000_000; suffix += 1) {
      const name =
        suffix === 0
          ? definition.baseName
          : suffix === 1
            ? `${definition.baseName} (System)`
            : `${definition.baseName} (System ${suffix})`
      const nameTaken = await prisma.bankAccount.findFirst({
        where: { tenantId, name },
        select: { id: true },
      })
      if (nameTaken) continue

      // `isSystem` engages the partial tenant/type index. `skipDuplicates`
      // therefore resolves a concurrent first request without treating a
      // tenant-created holding account as the system account.
      await prisma.bankAccount.createMany({
        data: {
          id: definition.id,
          tenantId,
          name,
          accountType: definition.accountType,
          currency: tenant.defaultCurrency,
          openingBalance: 0n,
          isActive: true,
          isSystem: true,
          createdAt: now,
          updatedAt: now,
        },
        skipDuplicates: true,
      })
      const ensured = await prisma.bankAccount.findFirst({
        where: { tenantId, accountType: definition.accountType, isSystem: true },
        select: { id: true },
      })
      if (ensured) break
    }
  }
}

export async function findBankAccountRow(tenantId: string, id: string) {
  const [account, totals] = await Promise.all([
    prisma.bankAccount.findFirst({ where: { tenantId, id } }),
    prisma.bankTransaction.groupBy({
      by: ['type'],
      where: { tenantId, accountId: id, status: { not: 'EXCLUDED' } },
      _sum: { amount: true },
    }),
  ])
  if (!account) return null

  const movement = totals.reduce(
    (sum, row) =>
      sum +
      (row.type === 'CREDIT'
        ? (row._sum.amount ?? 0n)
        : -(row._sum.amount ?? 0n)),
    0n
  )

  return { ...account, balance: account.openingBalance + movement }
}

export function createBankAccountRow(
  tenantId: string,
  id: string,
  body: BankAccountCreateBody,
  now: number
) {
  return prisma.bankAccount.create({
    data: {
      id,
      tenantId,
      name: body.name,
      accountType: body.accountType,
      currency: body.currency,
      description: body.description ?? null,
      directoryBankId: body.directoryBankId ?? null,
      directoryBranchId: body.directoryBranchId ?? null,
      institutionName: body.institutionName ?? null,
      accountHolderName: body.accountHolderName ?? null,
      accountNumberLast4: body.accountNumberLast4 ?? null,
      openingBalance: body.openingBalance ?? 0n,
      openingBalanceAt: body.openingBalanceAt ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })
}

export function findBankAccountActivityRow(tenantId: string, id: string) {
  return prisma.bankAccount.findFirst({
    where: { tenantId, id },
    include: {
      _count: {
        select: {
          payments: true,
          transactions: true,
          statementImports: true,
          reconciliations: true,
        },
      },
    },
  })
}

export async function updateBankAccountRow(
  tenantId: string,
  id: string,
  body: BankAccountUpdateBody,
  now: number
) {
  const result = await prisma.bankAccount.updateMany({
    where: { tenantId, id },
    data: { ...body, updatedAt: now },
  })

  return result.count ? findBankAccountRow(tenantId, id) : null
}

export async function deleteBankAccountRow(tenantId: string, id: string) {
  const result = await prisma.bankAccount.deleteMany({ where: { tenantId, id } })
  return result.count > 0
}

export function listBankTransactionRows(tenantId: string, accountId: string) {
  return prisma.bankTransaction.findMany({
    where: { tenantId, accountId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
}

export function findBankTransactionRow(
  tenantId: string,
  accountId: string,
  id: string
) {
  return prisma.bankTransaction.findFirst({
    where: { tenantId, accountId, id },
  })
}

export function createBankTransactionRow(
  tenantId: string,
  accountId: string,
  id: string,
  body: BankTransactionCreateBody,
  now: number
) {
  return prisma.bankTransaction.create({
    data: {
      id,
      tenantId,
      accountId,
      ...body,
      description: body.description ?? null,
      reference: body.reference ?? null,
      status: 'UNCATEGORIZED',
      createdAt: now,
      updatedAt: now,
    },
  })
}

export async function updateBankTransactionRow(
  tenantId: string,
  accountId: string,
  id: string,
  body: BankTransactionUpdateBody,
  now: number
) {
  const result = await prisma.bankTransaction.updateMany({
    where: { tenantId, accountId, id },
    data: { ...body, updatedAt: now },
  })

  return result.count ? findBankTransactionRow(tenantId, accountId, id) : null
}

export async function deleteBankTransactionRow(
  tenantId: string,
  accountId: string,
  id: string
) {
  const result = await prisma.bankTransaction.deleteMany({
    where: { tenantId, accountId, id },
  })

  return result.count > 0
}
