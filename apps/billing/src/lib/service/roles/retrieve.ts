import { prisma } from '@/lib/db'
import type { RoleResource } from '@/types/access'

import { roleView } from './view'

export async function retrieve(
  tenantId: string,
  roleId: string
): Promise<RoleResource | null> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
    include: { _count: { select: { members: true } } },
  })
  return role ? roleView(role) : null
}
