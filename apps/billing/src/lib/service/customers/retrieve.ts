import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned customer and its activity totals. */
export function retrieve(tenantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    include: {
      priceList: true,
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      },
      _count: { select: { invoices: true, quotes: true, subscriptions: true } },
    },
  })
}
