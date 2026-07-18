import { prisma } from '@/lib/db'

/** Lists tenant-owned quotes with their customer and line snapshots. */
export function list(
  tenantId: string,
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED'
) {
  return prisma.quote.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: { customer: true, lines: true, convertedInvoice: true },
    orderBy: { createdAt: 'desc' },
  })
}
