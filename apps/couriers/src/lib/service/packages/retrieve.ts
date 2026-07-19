import { prisma } from '@/lib/db'
import type {
  PortalPackage,
  TenantPackageRetrieveParams,
} from '@/types/package'

export function retrieve(
  params: TenantPackageRetrieveParams
): Promise<PortalPackage | null> {
  return prisma.package.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.id,
    },
    include: {
      carrier: { select: { name: true } },
      branch: { select: { name: true } },
      mailbox: { select: { number: true } },
    },
  })
}
