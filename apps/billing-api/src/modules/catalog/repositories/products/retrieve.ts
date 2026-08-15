import { prisma } from '@/db/client'

/** Retrieves one tenant-owned product and its references. */
export function retrieve(tenantId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, tenantId },
    include: {
      _count: {
        select: { plans: true, addons: true, coupons: true },
      },
      fallbackPlan: true,
    },
  })
}
