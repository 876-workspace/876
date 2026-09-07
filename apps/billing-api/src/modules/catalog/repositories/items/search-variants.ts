import { prisma } from '@/db/client'

/** Searches active sellable Variants without loading every Variant for each parent Item. */
export function searchVariants(
  tenantId: string,
  q: string,
  limit = 20,
  sourceAppId?: string
) {
  return prisma.itemVariant.findMany({
    where: {
      tenantId,
      isActive: true,
      item: {
        tenantId,
        isActive: true,
        variantMode: 'variant',
        ...(sourceAppId ? { sourceAppId } : {}),
      },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { item: { name: { contains: q, mode: 'insensitive' } } },
        {
          optionValues: {
            some: {
              optionValue: { value: { contains: q, mode: 'insensitive' } },
            },
          },
        },
      ],
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          unit: true,
          defaultSellingAmount: true,
          defaultSellingCurrency: true,
          defaultCostAmount: true,
          defaultCostCurrency: true,
          trackStock: true,
          lowStockThreshold: true,
          allowOutOfStock: true,
        },
      },
      optionValues: {
        include: { option: true, optionValue: true },
      },
      media: { orderBy: { position: 'asc' }, take: 1 },
    },
    orderBy: [{ item: { name: 'asc' } }, { name: 'asc' }],
    take: limit,
  })
}
