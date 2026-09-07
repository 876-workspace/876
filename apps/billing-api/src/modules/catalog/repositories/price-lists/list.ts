import { prisma } from '@/db/client'

export function list(tenantId: string, isActive?: boolean) {
  return prisma.priceList.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      entries: { include: { price: true, tiers: true } },
      _count: {
        select: {
          customers: true,
          invoices: true,
          quotes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
