import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned plan and its references. */
export function retrieve(tenantId: string, planId: string) {
  return prisma.plan.findFirst({
    where: { id: planId, tenantId },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      _count: { select: { prices: true } },
      addonAssociations: { include: { addon: true } },
    },
  })
}
