import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { isValidPermissionKey, PERMISSION_CATALOG } from '@/lib/permissions'
import type { ServiceResult } from '@/types/api'
import {
  roleUpdateParamsSchema,
  type RoleUpdateParams,
  type RoleView,
} from '@/types/role'

import { errFrom, ok } from '../result'
import { isUniqueConstraintError } from '../prisma-errors'
import { toRoleView } from './view'

export async function update(
  tenantId: string,
  roleId: string,
  params: RoleUpdateParams
): ServiceResult<RoleView> {
  const existing = await prisma.role.findFirst({
    where: { id: roleId, tenantId },
  })
  if (!existing) return errFrom('role/not-found')
  if (existing.systemKey !== null) return errFrom('role/default-immutable')

  const parsed = roleUpdateParamsSchema.safeParse(params)
  if (!parsed.success) return errFrom('error/validation-failed')

  if (
    parsed.data.permissions?.some(
      (key) => !isValidPermissionKey(PERMISSION_CATALOG, key)
    )
  )
    return errFrom('role/invalid-permission')

  try {
    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description,
        }),
        ...(parsed.data.permissions !== undefined && {
          permissions: parsed.data.permissions,
        }),
        updatedAt: nowUnixSeconds(),
      },
      include: { _count: { select: { members: true } } },
    })

    return ok(toRoleView(role, role._count.members))
  } catch (error) {
    if (isUniqueConstraintError(error)) return errFrom('role/name-taken')
    throw error
  }
}
