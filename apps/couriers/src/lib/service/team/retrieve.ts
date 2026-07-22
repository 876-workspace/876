import { prisma } from '@/lib/db'
import type { TeamMemberView } from '@/types/team'

import { toTeamMemberView } from './view'

export async function retrieve(
  tenantId: string,
  id: string
): Promise<TeamMemberView | null> {
  const member = await prisma.teamMember.findFirst({
    where: { id, tenantId },
    include: { role: true },
  })
  if (!member) return null

  return toTeamMemberView(member)
}
