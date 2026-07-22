import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { TeamMemberEnsureParams, TeamMemberView } from '@/types/team'

import { errFrom, ok } from '../result'
import { isUniqueConstraintError } from '../prisma-errors'
import { roles } from '../roles'
import { toTeamMemberView } from './view'

export async function ensure(
  tenantId: string,
  params: TeamMemberEnsureParams
): ServiceResult<TeamMemberView> {
  const existing = await prisma.teamMember.findUnique({
    where: {
      team_members_tenant_id_user_id_key: {
        tenantId,
        userId: params.userId,
      },
    },
    include: { role: true },
  })
  if (existing) return ok(toTeamMemberView(existing))

  await roles.ensureDefaults(tenantId)

  const role = await prisma.role.findUnique({
    where: {
      roles_tenant_id_system_key_key: {
        tenantId,
        systemKey: params.systemKey,
      },
    },
    select: { id: true },
  })
  if (!role) return errFrom('team/role-not-found')

  const now = nowUnixSeconds()

  try {
    const member = await prisma.teamMember.create({
      data: {
        tenantId,
        userId: params.userId,
        roleId: role.id,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      include: { role: true },
    })

    return ok(toTeamMemberView(member))
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error

    const raceWinner = await prisma.teamMember.findUnique({
      where: {
        team_members_tenant_id_user_id_key: {
          tenantId,
          userId: params.userId,
        },
      },
      include: { role: true },
    })
    if (raceWinner) return ok(toTeamMemberView(raceWinner))

    return errFrom('team/already-member')
  }
}
