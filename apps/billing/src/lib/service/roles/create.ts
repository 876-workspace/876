import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { RoleCreateParams } from '@/types/access'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

export async function create(
  tenantId: string,
  params: RoleCreateParams
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    const role = await prisma.role.create({
      data: {
        id: generateId('Role'),
        tenantId,
        slug: params.slug,
        name: params.name,
        description: params.description ?? '',
        permissions: [...new Set(params.permissions)],
        isSystem: false,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
    })
    return ok({ id: role.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A role with this identifier already exists.', 409)

    console.error('[billing.service.roles.create]', error)
    return err('Failed to create the role.', 500)
  }
}
