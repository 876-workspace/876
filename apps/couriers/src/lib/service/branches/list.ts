import { prisma } from '@/lib/db'
import type { BranchListParams } from '@/types/branch'

export function list(params: BranchListParams & { tenantId: string }) {
  return prisma.branch.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    take: params.limit,
    include: { address: true },
  })
}
