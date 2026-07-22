import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { TeamMemberCreateParams, TeamMemberView } from '@/types/team'

import { errFrom, ok } from '../result'
import { isUniqueConstraintError } from '../prisma-errors'
import { toTeamMemberView } from './view'

export async function create(
  tenantId: string,
  params: TeamMemberCreateParams
): ServiceResult<TeamMemberView> {
  const role = await prisma.role.findFirst({
    where: { id: params.roleId, tenantId },
    select: { id: true },
  })
  if (!role) return errFrom('team/role-not-found')

  const now = nowUnixSeconds()

  try {
    const member = await prisma.teamMember.create({
      data: {
        tenantId,
        userId: params.userId,
        roleId: params.roleId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      include: { role: true },
    })

    return ok(toTeamMemberView(member))
  } catch (error) {
    if (isUniqueConstraintError(error)) return errFrom('team/already-member')
    throw error
  }
}
