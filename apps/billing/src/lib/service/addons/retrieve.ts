import { prisma } from '@/lib/db'

export function retrieve(tenantId: string, addonId: string) {
  return prisma.addon.findFirst({
    where: { id: addonId, tenantId },
    include: {
      product: true,
      prices: { include: { tiers: { orderBy: { fromUnit: 'asc' } } } },
      planAssociations: { include: { plan: true } },
      _count: {
        select: {
          prices: true,
          couponApplicabilities: true,
        },
      },
    },
  })
}
