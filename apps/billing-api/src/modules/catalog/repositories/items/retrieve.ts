import { prisma } from '@/db/client'

/** Retrieves one tenant-owned item with its variant structure and Storage media references. */
export function retrieve(
  tenantId: string,
  itemId: string,
  sourceAppId?: string
) {
  return prisma.item.findFirst({
    where: { id: itemId, tenantId, ...(sourceAppId ? { sourceAppId } : {}) },
    include: {
      options: {
        include: { values: { orderBy: { position: 'asc' } } },
        orderBy: { position: 'asc' },
      },
      variants: {
        include: {
          optionValues: {
            include: { option: true, optionValue: true },
          },
          media: { orderBy: { position: 'asc' } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
      media: {
        where: { variantId: null },
        orderBy: { position: 'asc' },
      },
      _count: {
        select: {
          prices: true,
          quoteLines: true,
          invoiceLines: true,
          variants: true,
        },
      },
    },
  })
}
