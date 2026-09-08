import { prisma } from '@/db/client'

export function listRefunds(tenantId: string, sourceAppId?: string) {
  return prisma.refund.findMany({
    where: {
      tenantId,
      ...(sourceAppId
        ? { payment: { is: { sourceAppId } } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
}
