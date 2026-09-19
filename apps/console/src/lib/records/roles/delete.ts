import { prisma } from '@/lib/db'
import type { DeletedRole } from '@/types/role'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { retrieve } from './retrieve'

/** Delete a custom role. System roles and roles with members are protected. */
export async function deleteRole(name: string): ServiceResult<DeletedRole> {
  const role = await retrieve(name)
  if (!role) return err('Role not found.', 404)
  if (role.isSystem) return err('System roles cannot be deleted.')
  if (role._count.members > 0) {
    return err(
      `Reassign the ${role._count.members} user(s) on this role before deleting it.`
    )
  }

  await prisma.role.delete({ where: { name } })

  return ok({ name, deleted: true })
}
