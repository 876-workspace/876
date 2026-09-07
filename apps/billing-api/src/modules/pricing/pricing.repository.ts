import { prisma } from '@/db/client'

export function loadPricingContext(
  tenantId: string,
  priceIds: readonly string[],
  priceListId?: string | null
) {
  return Promise.all([
    prisma.price.findMany({
      where: { id: { in: [...priceIds] }, tenantId, isActive: true },
      include: {
        item: true,
        plan: { include: { product: true } },
        addon: { include: { product: true } },
        tiers: { orderBy: { fromUnit: 'asc' } },
      },
    }),
    priceListId
      ? prisma.priceList.findFirst({
          where: { id: priceListId, tenantId, isActive: true },
          include: {
            entries: {
              where: { priceId: { in: [...priceIds] } },
              include: { tiers: { orderBy: { fromUnit: 'asc' } } },
            },
          },
        })
      : null,
  ])
}
