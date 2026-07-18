import { prisma } from '@/lib/db'
import type { RoleResource } from '@/types/access'

import { roleView } from './view'

export async function list(tenantId: string): Promise<RoleResource[]> {
  const roles = await prisma.role.findMany({
    where: { tenantId },
    include: { _count: { select: { members: true } } },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
  return roles.map(roleView)
}
