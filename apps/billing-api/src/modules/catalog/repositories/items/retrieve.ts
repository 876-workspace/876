import { prisma } from '@/db/client'

/** Retrieves one tenant-owned item and its references. */
export function retrieve(
  tenantId: string,
  itemId: string,
  sourceAppId?: string
) {
  return prisma.item.findFirst({
    where: { id: itemId, tenantId, ...(sourceAppId ? { sourceAppId } : {}) },
    include: {
      _count: {
        select: { prices: true, quoteLines: true, invoiceLines: true },
      },
    },
  })
}
