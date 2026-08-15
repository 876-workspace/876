import { prisma } from '@/db/client'

/** Lists sellable items in a tenant catalogue. */
export function list(
  tenantId: string,
  isActive?: boolean,
  sourceAppId?: string
) {
  return prisma.item.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sourceAppId !== undefined ? { sourceAppId } : {}),
    },
    include: { prices: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
}
