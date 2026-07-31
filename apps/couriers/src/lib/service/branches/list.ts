import { prisma } from '@/lib/db'
import type { BranchListParams, BranchView } from '@/types/branch'

import { BRANCH_WITH_ADDRESS, toBranchView } from './view'

export async function list(
  params: BranchListParams & { tenantId: string }
): Promise<BranchView[]> {
  const branches = await prisma.branch.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    take: params.limit,
    ...BRANCH_WITH_ADDRESS,
  })

  return branches.map(toBranchView)
}
