import { prisma } from '@/lib/db'
import type { RoleView } from '@/types/role'

import { toRoleView } from './view'

export async function retrieve(
  tenantId: string,
  roleId: string
): Promise<RoleView | null> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
    include: { _count: { select: { members: true } } },
  })
  if (!role) return null

  return toRoleView(role, role._count.members)
}
