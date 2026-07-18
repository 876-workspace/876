import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { RoleUpdateParams } from '@/types/access'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function update(
  tenantId: string,
  roleId: string,
  params: RoleUpdateParams
): ServiceResult<{ id: string }> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
  })
  if (!role) return err('Role not found.', 404)
  if (role.isSystem) return err('System roles cannot be modified.', 409)

  await prisma.role.update({
    where: { id: roleId },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.description !== undefined && {
        description: params.description ?? '',
      }),
      ...(params.permissions !== undefined && {
        permissions: [...new Set(params.permissions)],
      }),
      updatedAt: nowUnixSeconds(),
    },
  })
  return ok({ id: roleId })
}
