import { cache } from 'react'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData, toTeamMemberView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { getPlatformClient } from '@/lib/services/platform'
import type {
  PendingTeamInvite,
  TeamMemberRow,
  TeamRoleOption,
} from '@/types/team'

import { listTeamRoles } from './team-roles'

export type TeamData = {
  rows: TeamMemberRow[]
  roles: TeamRoleOption[]
  pendingInvites: PendingTeamInvite[]
}

/**
 * The users section's data, deduplicated for the lifetime of one request.
 *
 * The layout's list column and the member detail route both need the member
 * rows (and the detail route needs the role views too). The member list and
 * its per-member identity lookups are what make this page slow, so both
 * consumers share one cached promise rather than each paying for it.
 */
export const listTeamData = cache(
  async (orgSlug: string): Promise<TeamData | null> => {
    const ctx = await getManageContext(orgSlug)
    if (!ctx?.tenant) return null

    const platform = await getPlatformClient()
    const $876 = await getCouriers()
    const [membersResult, roleViews, invitesResult] = await Promise.all([
      // No status filter here: a layout receives no `searchParams`, so the
      // toolbar's filter is applied client-side in the list component — the
      // same split-view precedent as Console's team list.
      $876.memberships.list({ status: undefined }),
      listTeamRoles(ctx.tenant.id),
      platform.invites.list(ctx.orgId),
    ])
    const members =
      requireCouriersData(membersResult).data.map(toTeamMemberView)

    const identities = await Promise.all(
      members.map(async (member) => {
        const result = await platform.users.retrieve({ id: member.userId })

        return result.error ? null : result.data
      })
    )
    const rows: TeamMemberRow[] = members.map((member, index) => {
      const identity = identities[index]
      const fullName = [identity?.first_name, identity?.last_name]
        .filter(Boolean)
        .join(' ')

      return {
        id: member.id,
        userId: member.userId,
        name: fullName || identity?.email || member.userId,
        email: identity?.email ?? null,
        avatar: identity?.avatar ?? null,
        roleId: member.roleId,
        roleName: member.roleName,
        roleSystemKey: member.roleSystemKey,
        status: member.status,
        createdAt: member.createdAt,
      }
    })
    const roles: TeamRoleOption[] = roleViews.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      systemKey: role.systemKey,
    }))
    const pendingInvites: PendingTeamInvite[] = invitesResult.error
      ? []
      : invitesResult.data.data
          .filter((invite) => invite.status === 'pending')
          .map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expires_at,
          }))

    return { rows, roles, pendingInvites }
  }
)

/**
 * The invite dialog lives in the toolbar and needs the role list, so the
 * toolbar can only render outside Suspense if roles resolve without the slow
 * member list. Both `getManageContext` and `listTeamRoles` are `React.cache`d,
 * so the streamed list below reuses these exact promises rather than querying
 * the tenant twice.
 */
export async function listInviteRoleOptions(
  orgSlug: string
): Promise<Array<{ id: string; name: string }>> {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return []

  const roleViews = await listTeamRoles(ctx.tenant.id)
  return roleViews.map(({ id, name }) => ({ id, name }))
}
