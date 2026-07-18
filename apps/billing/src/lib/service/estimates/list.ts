import { prisma } from '@/lib/db'

/** Lists tenant-owned estimates with their customer and line snapshots. */
export function list(
  tenantId: string,
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED'
) {
  return prisma.estimate.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: { customer: true, lines: true },
    orderBy: { createdAt: 'desc' },
  })
}
