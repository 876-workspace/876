import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { LocationsCards } from './_components/locations-cards'

export const metadata = { title: 'Locations — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function LocationsSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <Page>
        <PageBreadcrumb
          href={`/org/${orgSlug}/settings`}
          label="Settings"
          className="mb-4"
        />
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load this organization&apos;s branches. Please try
          again.
        </div>
      </Page>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const branches = await service.branches.list({ tenantId })

  // Opportunistic repair for sites whose core mirror failed at write time. It
  // runs after the response so a slow identity API never delays this page.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <ResourceToolbar
        title="Locations"
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/settings/locations/new`}
        primaryVariant="info"
        refresh
      />

      <LocationsCards
        branches={branches}
        orgSlug={orgSlug}
        emptyState={
          <div className="876-empty-dashed max-w-2xl">No branches yet.</div>
        }
      />
    </Page>
  )
}
