import type { Role, TeamMember } from '@/lib/db'
import type { DefaultRoleKey } from '@/types/permissions'
import type { TeamMemberStatusValue, TeamMemberView } from '@/types/team'

type TeamMemberWithRole = TeamMember & {
  role: Pick<Role, 'name' | 'systemKey'>
}

function toDefaultRoleKey(systemKey: string | null): DefaultRoleKey | null {
  return systemKey === 'admin' || systemKey === 'staff' ? systemKey : null
}

export function toTeamMemberView(row: TeamMemberWithRole): TeamMemberView {
  return {
    id: row.id,
    userId: row.userId,
    roleId: row.roleId,
    roleName: row.role.name,
    roleSystemKey: toDefaultRoleKey(row.role.systemKey),
    status: row.status.toLowerCase() as TeamMemberStatusValue,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
