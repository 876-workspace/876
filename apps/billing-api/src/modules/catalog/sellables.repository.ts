import { prisma } from '@/db/client'

export function loadSellables(
  tenantId: string,
  itemIds: readonly string[],
  variantIds: readonly string[]
) {
  return Promise.all([
    prisma.item.findMany({
      where: { id: { in: [...itemIds] }, tenantId, isActive: true },
      include: {
        media: {
          where: { variantId: null },
          orderBy: { position: 'asc' },
          take: 1,
        },
      },
    }),
    prisma.itemVariant.findMany({
      where: {
        id: { in: [...variantIds] },
        tenantId,
        isActive: true,
        item: { tenantId, isActive: true, variantMode: 'variant' },
      },
      include: {
        media: { orderBy: { position: 'asc' }, take: 1 },
        item: {
          include: {
            media: {
              where: { variantId: null },
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
      },
    }),
  ])
}
