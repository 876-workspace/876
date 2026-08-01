import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { WarehousesTable } from './warehouses-table'

export const metadata = { title: 'Warehouses — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function WarehousesSettingsPage({ params }: Props) {
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
          We couldn&apos;t load this organization&apos;s warehouses. Please try
          again.
        </div>
      </Page>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const warehouses = await service.warehouses.list({ tenantId })

  // The warehouse form redirects here, so a warehouse whose core mirror failed
  // would otherwise stay unlinked no matter how often this list is refreshed.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <ResourceToolbar
        title="Warehouses"
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/settings/warehouses/new`}
        primaryVariant="info"
        refresh
      />

      <WarehousesTable
        warehouses={warehouses}
        orgSlug={orgSlug}
        emptyState={
          <div className="876-empty-dashed max-w-2xl">No warehouses yet.</div>
        }
      />
    </Page>
  )
}
