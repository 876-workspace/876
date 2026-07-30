import { notFound } from 'next/navigation'

import { isNotFoundError } from '@876/core/client/lookup'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { get876ServerClient } from '@/lib/876/server'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { LocationForm } from '../../location-form'

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ slug: string; locationId: string }>
}) {
  const { slug, locationId } = await params
  const sessionUser = await requireSession(`/${slug}/locations`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'structure:manage'
  )

  const client = await get876ServerClient()
  const result = await client.locations.retrieve(
    membership.organization.id,
    locationId
  )

  if (isNotFoundError(result.error)) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/locations`}
        label="Locations"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Edit</PageTitle>
      </PageHeader>

      {result.error || !result.data ? (
        <ErrorState
          error={
            result.error ?? {
              code: 'admin/error',
              message: 'An error occurred.',
            }
          }
        />
      ) : (
        <LocationForm slug={slug} location={result.data} />
      )}
    </Page>
  )
}
