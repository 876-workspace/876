import { prisma } from '@/lib/db'

/** Lists transactions for one tenant-owned account, newest first. */
export function list(tenantId: string, accountId: string) {
  return prisma.bankTransaction.findMany({
    where: { tenantId, accountId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
}
