import { prisma } from '@/lib/db'

/** Lists all immutable price records owned by the tenant. */
export function list(
  tenantId: string,
  isActive?: boolean,
  target?: { itemId?: string; planId?: string; addonId?: string }
) {
  return prisma.price.findMany({
    where: {
      tenantId,
      ...target,
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      item: true,
      plan: { include: { product: true } },
      addon: { include: { product: true } },
      tiers: { orderBy: { fromUnit: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
