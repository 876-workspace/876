import { prisma } from '@/db/client'

/** Lists sellable items in a tenant catalogue. */
export function list(
  tenantId: string,
  isActive?: boolean,
  sourceAppId?: string,
  q?: string,
  limit = 100
) {
  return prisma.item.findMany({
    where: {
      tenantId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sourceAppId !== undefined ? { sourceAppId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { prices: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
