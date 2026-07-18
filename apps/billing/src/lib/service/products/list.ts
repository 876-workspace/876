import { prisma } from '@/lib/db'

/** Lists subscription products with their plans and current price history. */
export function list(tenantId: string, isActive?: boolean) {
  return prisma.product.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      fallbackPlan: true,
      addons: { orderBy: { createdAt: 'desc' } },
      plans: {
        include: { prices: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
