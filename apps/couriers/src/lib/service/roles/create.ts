import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { isValidPermissionKey, PERMISSION_CATALOG } from '@/lib/permissions'
import type { ServiceResult } from '@/types/api'
import {
  roleCreateParamsSchema,
  type RoleCreateParams,
  type RoleView,
} from '@/types/role'

import { errFrom, ok } from '../result'
import { isUniqueConstraintError } from '../prisma-errors'
import { toRoleView } from './view'

export async function create(
  tenantId: string,
  params: RoleCreateParams
): ServiceResult<RoleView> {
  const parsed = roleCreateParamsSchema.safeParse(params)
  if (!parsed.success) return errFrom('error/validation-failed')

  if (
    parsed.data.permissions.some(
      (key) => !isValidPermissionKey(PERMISSION_CATALOG, key)
    )
  )
    return errFrom('role/invalid-permission')

  const now = nowUnixSeconds()

  try {
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        systemKey: null,
        permissions: parsed.data.permissions,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok(toRoleView(role, 0))
  } catch (error) {
    if (isUniqueConstraintError(error)) return errFrom('role/name-taken')
    throw error
  }
}
