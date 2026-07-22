import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { DeletedRole } from '@/types/role'

import { errFrom, ok } from '../result'

export async function deleteRole(
  tenantId: string,
  roleId: string
): ServiceResult<DeletedRole> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
    include: { _count: { select: { members: true } } },
  })
  if (!role) return errFrom('role/not-found')
  if (role.systemKey !== null) return errFrom('role/default-immutable')
  if (role._count.members > 0) return errFrom('role/in-use')

  await prisma.role.delete({ where: { id: roleId } })

  return ok({ id: roleId, deleted: true })
}
