import { prisma } from '@/lib/db'
import type { BranchView } from '@/types/branch'

import { BRANCH_WITH_ADDRESS, toBranchView } from './view'

export async function retrieve(params: {
  tenantId: string
  id: string
}): Promise<BranchView | null> {
  const branch = await prisma.branch.findFirst({
    where: { id: params.id, tenantId: params.tenantId },
    ...BRANCH_WITH_ADDRESS,
  })

  return branch ? toBranchView(branch) : null
}
