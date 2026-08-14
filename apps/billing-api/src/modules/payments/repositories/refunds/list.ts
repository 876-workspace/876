import { prisma } from '@/db/client'

export function listRefunds(tenantId: string) {
  return prisma.refund.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
}
