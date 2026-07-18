import { prisma } from '@/lib/db'

/** Lists plans independently for the plan-management surface. */
export function list(tenantId: string, isActive?: boolean, productId?: string) {
  return prisma.plan.findMany({
    where: {
      tenantId,
      ...(productId ? { productId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      product: true,
      prices: { include: { tiers: { orderBy: { fromUnit: 'asc' } } } },
      addonAssociations: { include: { addon: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
