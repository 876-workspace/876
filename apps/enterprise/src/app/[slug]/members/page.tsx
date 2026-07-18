import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { UserPlus } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import {
  hasOrgPermission,
  requireOrgPermission,
  requireSession,
} from '@/lib/auth/guards'

import { MembersTable } from './members-table'
import { PendingInvites } from './pending-invites'

export default async function OrganizationMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/members`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'members:read'
  )

  const canInvite = hasOrgPermission(membership, 'members:invite')
  const canManage = hasOrgPermission(membership, 'members:manage')

  const orgId = membership.organization.id
  const client = await getAdminClient()
  const [membersResult, rolesResult, invitesResult] = await Promise.all([
    client.orgs.members.list(orgId, { limit: 100 }),
    client.orgs.roles.list(orgId),
    canInvite ? client.orgs.listInvites(orgId) : Promise.resolve(null),
  ])
  const loadError = membersResult.error ?? rolesResult.error
  const members = membersResult.data?.data ?? []
  const roles = rolesResult.data?.data ?? []
  const pendingInvites = (invitesResult?.data?.data ?? []).filter(
    (invite) => invite.status === 'pending'
  )

  if (loadError) {
    return (
      <Page>
        <PageHeader>
          <PageTitle>Members</PageTitle>
        </PageHeader>
        <ErrorState error={loadError} />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader className="flex items-center justify-between gap-4">
        <PageTitle>Members</PageTitle>
        {canInvite && (
          <Link
            href={`/${slug}/members/new`}
            className={buttonVariants({ variant: 'info' })}
          >
            <UserPlus aria-hidden="true" className="size-3.5" />
            Invite
          </Link>
        )}
      </PageHeader>

      <div className="space-y-6">
        {canInvite && pendingInvites.length > 0 && (
          <PendingInvites slug={slug} invites={pendingInvites} />
        )}

        {members.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No members</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <MembersTable
            slug={slug}
            members={members}
            roles={roles.map((role) => ({
              name: role.name,
              display_name: role.display_name,
            }))}
            canManage={canManage}
            callerMembershipId={membership.id}
            callerIsOwner={membership.role === 'owner'}
          />
        )}
      </div>
    </Page>
  )
}
