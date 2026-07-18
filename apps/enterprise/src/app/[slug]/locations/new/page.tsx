import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { LocationForm } from '../location-form'

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/locations/new`)
  await requireOrgPermission(sessionUser.id, slug, 'structure:manage')

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/locations`}
        label="Locations"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Add</PageTitle>
      </PageHeader>

      <LocationForm slug={slug} />
    </Page>
  )
}
