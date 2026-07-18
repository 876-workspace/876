import { prisma } from '@/lib/db'
import type { BankAccountView } from '@/types/banking'

/** Lists accounts with balances derived from non-excluded transactions. */
export async function list(tenantId: string): Promise<BankAccountView[]> {
  const [accounts, totals] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
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
    const signedAmount = total.type === 'CREDIT' ? amount : -amount
    balances.set(
      total.accountId,
      (balances.get(total.accountId) ?? 0n) + signedAmount
    )
  }

  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0n,
  }))
}
