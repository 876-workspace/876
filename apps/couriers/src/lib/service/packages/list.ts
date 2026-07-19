import { prisma } from '@/lib/db'
import type { CustomerPackageListParams, PortalPackage } from '@/types/package'

export function list(
  params: CustomerPackageListParams
): Promise<PortalPackage[]> {
  return prisma.package.findMany({
    where: {
      tenantId: params.tenantId,
      customerId: params.customerId,
    },
    include: {
      carrier: { select: { name: true } },
      branch: { select: { name: true } },
      mailbox: { select: { number: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}
