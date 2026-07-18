import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { OrganizationDetailsForm } from './organization-details-form'

export default async function OrganizationEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/organization/edit`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:update'
  )

  const client = await getAdminClient()
  const orgResult = await client.orgs.retrieve(membership.organization.id)

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/organization/details`}
        label="Details"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Edit</PageTitle>
      </PageHeader>

      {orgResult.error ? (
        <ErrorState error={orgResult.error} />
      ) : (
        <OrganizationDetailsForm org={orgResult.data} slug={slug} />
      )}
    </Page>
  )
}
