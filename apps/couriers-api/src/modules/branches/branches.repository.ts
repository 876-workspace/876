import { prisma } from '@/db/client'

import type { BranchRow } from './branches.serializers'

const withAddress = { include: { address: true } } as const

export async function tenantExists(tenantId: string): Promise<boolean> {
  return Boolean(await prisma.tenant.findUnique({ where: { id: tenantId } }))
}

export async function findBranch(
  tenantId: string,
  id: string
): Promise<BranchRow | null> {
  const branch = await prisma.branch.findFirst({
    where: { tenantId, id },
    ...withAddress,
  })
  return branch as BranchRow | null
}

export async function listBranches(options: {
  tenantId: string
  isActive?: boolean
  limit: number
  startingAfter?: string
  endingBefore?: string
}): Promise<BranchRow[]> {
  const rows = await prisma.branch.findMany({
    where: {
      tenantId: options.tenantId,
      ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
      ...(options.startingAfter ? { id: { gt: options.startingAfter } } : {}),
      ...(options.endingBefore ? { id: { lt: options.endingBefore } } : {}),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    take: options.limit + 1,
    ...withAddress,
  })
  return rows as BranchRow[]
}

export function countBranches(tenantId: string): Promise<number> {
  return prisma.branch.count({ where: { tenantId } })
}

export { prisma }
