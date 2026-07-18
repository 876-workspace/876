import { prisma } from '@/lib/db'
import type { RoleCreateParams, RoleView } from '@/types/role'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { toRoleView } from './view'

/** Create a new custom role. */
export async function create(body: RoleCreateParams): ServiceResult<RoleView> {
  const { name, displayName, description, permissions } = body

  try {
    const row = await prisma.role.create({
      data: {
        name,
        displayName,
        description: description ?? '',
        permissions: permissions ?? [],
        isSystem: false,
      },
    })
    return ok(toRoleView(row, 0))
  } catch (e) {
    const isP2002 =
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: unknown }).code === 'P2002'
    if (isP2002) return err('A role with that name already exists.')
    throw e
  }
}
