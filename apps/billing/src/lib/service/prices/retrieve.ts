import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned price and its references. */
export function retrieve(tenantId: string, priceId: string) {
  return prisma.price.findFirst({
    where: { id: priceId, tenantId },
    include: {
      tiers: true,
      item: { select: { id: true, name: true } },
      plan: { select: { id: true, name: true, code: true } },
      addon: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          subscriptionItems: true,
          quoteLines: true,
          estimateLines: true,
          invoiceLines: true,
          creditNoteLines: true,
          priceListEntries: true,
        },
      },
    },
  })
}
