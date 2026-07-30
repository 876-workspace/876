import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { get876ServerClient } from '@/lib/876/server'
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

  const client = await get876ServerClient()
  const orgResult = await client.organizations.retrieve(
    membership.organization.id
  )

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
