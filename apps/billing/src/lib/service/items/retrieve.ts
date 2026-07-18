import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned item and its references. */
export function retrieve(tenantId: string, itemId: string) {
  return prisma.item.findFirst({
    where: { id: itemId, tenantId },
    include: {
      _count: {
        select: { prices: true, quoteLines: true, invoiceLines: true },
      },
    },
  })
}
