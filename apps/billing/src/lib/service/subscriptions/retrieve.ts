import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned subscription with its commercial context. */
export function retrieve(tenantId: string, subscriptionId: string) {
  return prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: {
      customer: true,
      invoices: {
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      events: { orderBy: { occurredAt: 'desc' } },
      amendments: {
        include: { items: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
      lifecycleSchedules: { orderBy: { createdAt: 'desc' } },
      charges: { orderBy: { createdAt: 'desc' } },
      discounts: {
        include: { coupon: true, promotionCode: true, subscriptionItem: true },
        orderBy: { createdAt: 'desc' },
      },
      items: {
        where: { isActive: true },
        include: {
          price: {
            include: { item: true, plan: { include: { product: true } } },
          },
        },
      },
    },
  })
}
