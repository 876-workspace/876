import { Page } from '@876/ui/page'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
import type {
  PendingTeamInvite,
  TeamMemberRow,
  TeamMemberStatusValue,
  TeamRoleOption,
} from '@/types/team'

import { PendingInvites } from './pending-invites'
import { UsersSplit } from './users-split'
import { UsersToolbar } from './users-toolbar'

export const metadata = { title: 'Users — Settings' }

const TEAM_MEMBER_STATUSES = ['active', 'inactive'] as const

function isTeamMemberStatus(
  value: string | undefined
): value is TeamMemberStatusValue {
  return TEAM_MEMBER_STATUSES.some((status) => status === value)
}

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string; user?: string }>
}

export default async function UsersSettingsPage({
  params,
  searchParams,
}: Props) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams])
  const selectedStatus = isTeamMemberStatus(query.status) ? query.status : 'all'
  const status = selectedStatus === 'all' ? undefined : selectedStatus

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <Page>
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load this organization&apos;s users. Please try
          again.
        </div>
      </Page>
    )

  await service.team.ensure(ctx.tenant.id, {
    userId: ctx.userId,
    systemKey: ctx.role === 'owner' || ctx.role === 'admin' ? 'admin' : 'staff',
  })

  const platform = await getPlatformClient()
  const [members, roleViews, invitesResult] = await Promise.all([
    service.team.list(ctx.tenant.id, { status }),
    service.roles.list(ctx.tenant.id),
    platform.orgs.invites.list(ctx.orgId),
  ])

  const identities = await Promise.all(
    members.map(async (member) => {
      const result = await platform.users.retrieve(member.userId)

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
  const selectedId = rows.some((row) => row.id === query.user)
    ? query.user
    : undefined

  return (
    <Page>
      <UsersToolbar
        orgSlug={orgSlug}
        roles={roles.map(({ id, name }) => ({ id, name }))}
        status={selectedStatus}
      />
      <UsersSplit
        rows={rows}
        roles={roles}
        selectedId={selectedId}
        orgSlug={orgSlug}
      />
      <PendingInvites orgSlug={orgSlug} invites={pendingInvites} />
    </Page>
  )
}
