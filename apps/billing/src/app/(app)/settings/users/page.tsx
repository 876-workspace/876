import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { ShieldCheck } from '@876/ui/icons'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { MembersTable } from '@/features/access/components/members-table'
import { PendingInvites } from '@/features/access/components/pending-invites'
import {
  normalizeOrgRole,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getPlatformClient } from '@/lib/services/platform'
import type { InviteView, MemberView } from '@/types/access'

export const metadata = { title: 'Users - Billing settings' }

export default async function UsersPage() {
  const context = await requirePagePermission('members:read')
  const platform = await getPlatformClient()
  const [roles, grants, membershipsResult, invitesResult] = await Promise.all([
    service.roles.list(context.tenant.id),
    service.members.list(context.tenant.id),
    platform.memberships.list({
      organizationId: context.orgId,
      limit: 100,
    }),
    platform.invites.list(context.orgId),
  ])
  const memberships = (membershipsResult.data?.data ?? []).filter(
    (membership) => membership.status === 'active'
  )
  const identities = await Promise.all(
    memberships.map((membership) =>
      platform.users
        .retrieve({ id: membership.user_id })
        .then((result) => result.data)
        .catch(() => null)
    )
  )
  const grantByUserId = new Map(grants.map((grant) => [grant.userId, grant]))
  const roleBySlug = new Map(roles.map((role) => [role.slug, role]))

  const members: MemberView[] = memberships.flatMap((membership, index) => {
    const identity = identities[index]
    const orgRole = normalizeOrgRole(membership.role)
    const storedGrant = grantByUserId.get(membership.user_id)
    const fallbackSlug =
      orgRole === 'super-admin' ? 'super-admin' : orgRole === 'admin' ? 'admin' : 'viewer'
    const effectiveRole =
      orgRole === 'super-admin'
        ? roleBySlug.get('super-admin')
        : (storedGrant?.role ?? roleBySlug.get(fallbackSlug))
    if (!effectiveRole) return []

    return [
      {
        userId: membership.user_id,
        firstName: identity?.first_name ?? '',
        lastName: identity?.last_name ?? '',
        email: identity?.email ?? '',
        avatar: identity?.avatar ?? null,
        organizationRole: membership.role,
        roleId: effectiveRole.id,
        roleName: effectiveRole.name,
        roleSlug: effectiveRole.slug,
        status:
          orgRole === 'super-admin' ? 'ACTIVE' : (storedGrant?.status ?? 'ACTIVE'),
        explicitGrant: Boolean(storedGrant),
      },
    ]
  })
  const invites: InviteView[] = (invitesResult.data?.data ?? []).flatMap(
    (invite) => {
      if (invite.status !== 'pending') return []
      return [
        {
          id: invite.id,
          email: invite.email,
          role: invite.role ?? 'Viewer',
          status: invite.status,
          expiresAt: invite.expires_at,
        },
      ]
    }
  )
  const canManage = context.permissions.includes('members:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader className="mb-0">
          <PageTitle>Users</PageTitle>
        </PageHeader>
        {canManage ? (
          <Link
            href="/settings/users/invite"
            className={buttonVariants({ variant: 'info' })}
          >
            Invite
          </Link>
        ) : null}
      </div>

      <div className="border-border bg-muted/20 mb-5 flex gap-3 rounded-2xl border p-4">
        <ShieldCheck className="text-876-blue mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">
            Organization membership is still required
          </p>
          <p className="text-muted-foreground mt-1">
            New organization members receive the Viewer role by default. The
            organization super admin always retains Billing super admin access as a recovery
            path.
          </p>
        </div>
      </div>

      <MembersTable
        members={members}
        roles={roles}
        currentUserId={context.userId}
        canManage={canManage}
        canGrantSuperAdmin={context.access.role.slug === 'super-admin'}
      />

      {invites.length > 0 ? (
        <section className="mt-8">
          <h2 className="876-section-title mb-3">Pending invites</h2>
          <PendingInvites invites={invites} canManage={canManage} />
        </section>
      ) : null}

      {membershipsResult.data?.has_more ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Showing the first 100 active organization members.
        </p>
      ) : null}
    </Page>
  )
}
