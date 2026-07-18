import { prisma } from '@/lib/db'

export function retrieve(
  tenantId: string,
  accountId: string,
  transactionId: string
) {
  return prisma.bankTransaction.findFirst({
    where: { id: transactionId, tenantId, accountId },
  })
}
