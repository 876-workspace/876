import { prisma } from '@/db/client'

export function retrieve(tenantId: string, priceListId: string) {
  return prisma.priceList.findFirst({
    where: { id: priceListId, tenantId },
    include: {
      entries: {
        include: {
          price: { include: { item: true, plan: true, addon: true } },
          tiers: { orderBy: { fromUnit: 'asc' } },
        },
      },
      _count: {
        select: {
          customers: true,
          invoices: true,
          quotes: true,
        },
      },
    },
  })
}
