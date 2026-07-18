import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned customer and its activity totals. */
export function retrieve(tenantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    include: {
      priceList: true,
      _count: { select: { invoices: true, quotes: true, subscriptions: true } },
    },
  })
}
