import { prisma } from '@/lib/db'
import type { TeamMemberListParams, TeamMemberView } from '@/types/team'

import { toTeamMemberView } from './view'

export async function list(
  tenantId: string,
  params: TeamMemberListParams = {}
): Promise<TeamMemberView[]> {
  const members = await prisma.teamMember.findMany({
    where: {
      tenantId,
      ...(params.status !== undefined && {
        status: params.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      }),
    },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })

  return members.map(toTeamMemberView)
}
