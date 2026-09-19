import { prisma } from '@/lib/db'
import type { RoleUpdateParams, RoleView } from '@/types/role'
import type { ServiceResult } from '@/types/api'

import { ok } from '../result'
import { toRoleView } from './view'

/** Update a role's display fields and/or permissions. */
export async function update(
  name: string,
  body: RoleUpdateParams
): ServiceResult<RoleView> {
  const row = await prisma.role.update({
    where: { name },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.permissions !== undefined && { permissions: body.permissions }),
    },
    include: { _count: { select: { members: true } } },
  })

  return ok(toRoleView(row, row._count.members))
}
