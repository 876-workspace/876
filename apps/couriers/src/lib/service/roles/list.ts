import { prisma } from '@/lib/db'
import type { RoleView } from '@/types/role'

import { toRoleView } from './view'

export async function list(tenantId: string): Promise<RoleView[]> {
  const roles = await prisma.role.findMany({
    where: { tenantId },
    include: { _count: { select: { members: true } } },
    orderBy: [{ systemKey: 'asc' }, { name: 'asc' }],
  })

  return roles.map((role) => toRoleView(role, role._count.members))
}
