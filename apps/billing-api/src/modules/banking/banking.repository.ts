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
  const balances = new Map<string, bigint>()
  for (const total of totals) {
    const amount = total._sum.amount ?? 0n
    balances.set(
      total.accountId,
      (balances.get(total.accountId) ?? 0n) +
        (total.type === 'CREDIT' ? amount : -amount)
    )
  }
  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0n,
  }))
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
  const balance = totals.reduce(
    (sum, row) =>
      sum +
      (row.type === 'CREDIT'
        ? (row._sum.amount ?? 0n)
        : -(row._sum.amount ?? 0n)),
    0n
  )
  return { ...account, balance }
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
      ...body,
      description: body.description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })
}

export function findBankAccountActivityRow(tenantId: string, id: string) {
  return prisma.bankAccount.findFirst({
    where: { tenantId, id },
    include: { _count: { select: { payments: true, transactions: true } } },
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
  const result = await prisma.bankAccount.deleteMany({
    where: { tenantId, id },
  })
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
