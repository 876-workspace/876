import { prisma } from '@/lib/db'
import type { BankAccountView } from '@/types/banking'

/** Retrieves one tenant-owned account with its calculated balance. */
export async function retrieve(
  tenantId: string,
  accountId: string
): Promise<BankAccountView | null> {
  const [account, totals] = await Promise.all([
    prisma.bankAccount.findFirst({ where: { id: accountId, tenantId } }),
    prisma.bankTransaction.groupBy({
      by: ['type'],
      where: { tenantId, accountId, status: { not: 'EXCLUDED' } },
      _sum: { amount: true },
    }),
  ])
  if (!account) return null

  const balance = totals.reduce((total, row) => {
    const amount = row._sum.amount ?? 0n
    return total + (row.type === 'CREDIT' ? amount : -amount)
  }, 0n)

  return { ...account, balance }
}
