import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function deleteRole(
  tenantId: string,
  roleId: string
): ServiceResult<{ id: string; deleted: true }> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
    include: { _count: { select: { members: true } } },
  })
  if (!role) return err('Role not found.', 404)
  if (role.isSystem) return err('System roles cannot be deleted.', 409)
  if (role._count.members > 0)
    return err('Reassign every member from this role before deleting it.', 409)

  await prisma.role.delete({ where: { id: roleId } })
  return ok({ id: roleId, deleted: true })
}
