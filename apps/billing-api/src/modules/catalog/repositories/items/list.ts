import { prisma } from '@/db/client'

/** Lists sellable Items while allowing parent searches to match Variant names/SKUs/values. */
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
              {
                variants: {
                  some: {
                    isActive: true,
                    OR: [
                      { name: { contains: q, mode: 'insensitive' } },
                      { sku: { contains: q, mode: 'insensitive' } },
                      {
                        optionValues: {
                          some: {
                            optionValue: {
                              value: { contains: q, mode: 'insensitive' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      prices: { orderBy: { createdAt: 'asc' } },
      media: {
        where: { variantId: null },
        orderBy: { position: 'asc' },
        take: 1,
      },
      _count: { select: { variants: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
