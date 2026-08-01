import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import Link from 'next/link'
import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { formatAddressLine } from '@/lib/address/format'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

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

      {warehouses.length === 0 ? (
        <div className="876-empty-dashed max-w-2xl">No warehouses yet.</div>
      ) : (
        <ul className="max-w-3xl space-y-2">
          {warehouses.map((warehouse) => (
            <li
              key={warehouse.id}
              className="876-card flex items-start justify-between gap-4 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{warehouse.name}</span>
                  {warehouse.isPrimary ? <Badge>Primary</Badge> : null}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatAddressLine(warehouse.address)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {warehouse.address.countryCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={`/org/${orgSlug}/settings/warehouses/${warehouse.id}/edit`}
                    />
                  }
                >
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
