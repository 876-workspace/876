import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type TeamMemberStatus } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type {
  TeamMemberStatusValue,
  TeamMemberUpdateParams,
  TeamMemberView,
} from '@/types/team'

import { errFrom, ok } from '../result'
import { toTeamMemberView } from './view'

function toPrismaStatus(
  status: TeamMemberStatusValue | undefined,
  fallback: TeamMemberStatus
): TeamMemberStatus {
  if (status === undefined) return fallback

  return status === 'active' ? 'ACTIVE' : 'INACTIVE'
}

export async function update(
  tenantId: string,
  id: string,
  params: TeamMemberUpdateParams
): ServiceResult<TeamMemberView> {
  const existing = await prisma.teamMember.findFirst({
    where: { id, tenantId },
    include: { role: true },
  })
  if (!existing) return errFrom('team/not-found')

  const role =
    params.roleId !== undefined
      ? await prisma.role.findFirst({
          where: { id: params.roleId, tenantId },
        })
      : existing.role
  if (!role) return errFrom('team/role-not-found')

  const status = toPrismaStatus(params.status, existing.status)
  const removesActiveAdmin =
    existing.status === 'ACTIVE' &&
    existing.role.systemKey === 'admin' &&
    (status !== 'ACTIVE' || role.systemKey !== 'admin')

  if (removesActiveAdmin) {
    const activeAdminCount = await prisma.teamMember.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: { systemKey: 'admin' },
      },
    })
    if (activeAdminCount <= 1) return errFrom('team/last-active-admin')
  }

  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      ...(params.roleId !== undefined && { roleId: params.roleId }),
      ...(params.status !== undefined && { status }),
      updatedAt: nowUnixSeconds(),
    },
    include: { role: true },
  })

  return ok(toTeamMemberView(member))
}
