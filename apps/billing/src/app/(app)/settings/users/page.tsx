import { ShieldCheck } from '@876/ui/icons'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { MembersTable } from '@/components/billing-members-table'
import {
  normalizeOrgRole,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getPlatformClient } from '@/lib/876/platform-client'
import type { MemberView } from '@/types/access'

export const metadata = { title: 'Users - Billing settings' }

export default async function UsersPage() {
  const context = await requirePagePermission('members:read')
  const platform = await getPlatformClient()
  const [roles, grants, membershipsResult] = await Promise.all([
    service.roles.list(context.tenant.id),
    service.members.list(context.tenant.id),
    platform.memberships.list({
      organization_id: context.orgId,
      limit: 100,
    }),
  ])
  const memberships = (membershipsResult.data?.data ?? []).filter(
    (membership) => membership.status === 'active'
  )
  const identities = await Promise.all(
    memberships.map((membership) =>
      platform.users
        .retrieve(membership.user_id)
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
      orgRole === 'owner' ? 'owner' : orgRole === 'admin' ? 'admin' : 'viewer'
    const effectiveRole =
      orgRole === 'owner'
        ? roleBySlug.get('owner')
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
          orgRole === 'owner' ? 'ACTIVE' : (storedGrant?.status ?? 'ACTIVE'),
        explicitGrant: Boolean(storedGrant),
      },
    ]
  })

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader>
        <PageTitle>Users</PageTitle>
      </PageHeader>

      <div className="border-border bg-muted/20 mb-5 flex gap-3 rounded-2xl border p-4">
        <ShieldCheck className="text-876-blue mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">
            Organization membership is still required
          </p>
          <p className="text-muted-foreground mt-1">
            New organization members receive the Viewer role by default. The
            organization owner always retains Billing owner access as a recovery
            path.
          </p>
        </div>
      </div>

      <MembersTable
        members={members}
        roles={roles}
        currentUserId={context.userId}
        canManage={context.permissions.includes('members:write')}
        canGrantOwner={context.access.role.slug === 'owner'}
      />

      {membershipsResult.data?.has_more ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Showing the first 100 active organization members.
        </p>
      ) : null}
    </Page>
  )
}
