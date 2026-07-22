import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { DeletedTeamMember } from '@/types/team'

import { errFrom, ok } from '../result'

export async function deleteTeamMember(
  tenantId: string,
  id: string
): ServiceResult<DeletedTeamMember> {
  const member = await prisma.teamMember.findFirst({
    where: { id, tenantId },
    include: { role: true },
  })
  if (!member) return errFrom('team/not-found')

  if (member.status === 'ACTIVE' && member.role.systemKey === 'admin') {
    const activeAdminCount = await prisma.teamMember.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: { systemKey: 'admin' },
      },
    })
    if (activeAdminCount <= 1) return errFrom('team/last-active-admin')
  }

  await prisma.teamMember.delete({ where: { id } })

  return ok({ id, deleted: true })
}
