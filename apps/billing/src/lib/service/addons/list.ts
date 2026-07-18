import { prisma } from '@/lib/db'

export function list(tenantId: string, isActive?: boolean, productId?: string) {
  return prisma.addon.findMany({
    where: {
      tenantId,
      ...(productId ? { productId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: {
      product: true,
      prices: { include: { tiers: { orderBy: { fromUnit: 'asc' } } } },
      planAssociations: { include: { plan: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
