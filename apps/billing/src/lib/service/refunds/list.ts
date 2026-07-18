import { prisma } from '@/lib/db'

export function listRefunds(tenantId: string) {
  return prisma.refund.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
}
