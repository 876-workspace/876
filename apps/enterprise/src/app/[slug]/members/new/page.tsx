import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { InviteForm } from './invite-form'

export default async function InviteMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/members/new`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'members:invite'
  )

  const client = await getAdminClient()
  const rolesResult = await client.orgs.roles.list(membership.organization.id)
  if (rolesResult.error) {
    return (
      <Page>
        <PageBreadcrumb
          href={`/${slug}/members`}
          label="Members"
          className="mb-4"
        />
        <PageHeader>
          <PageTitle>Invite</PageTitle>
        </PageHeader>
        <ErrorState error={rolesResult.error} />
      </Page>
    )
  }

  // Granting owner via invite is owner-only, same as direct role changes.
  const assignableRoles = rolesResult.data.data
    .filter((role) => membership.role === 'owner' || role.name !== 'owner')
    .map((role) => ({ name: role.name, display_name: role.display_name }))

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/members`}
        label="Members"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Invite</PageTitle>
      </PageHeader>

      <InviteForm slug={slug} roles={assignableRoles} />
    </Page>
  )
}
