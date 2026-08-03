import { Suspense } from 'react'
import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { WarehousesCards } from './_components/warehouses-cards'

export const metadata = { title: 'Warehouses — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default function WarehousesSettingsPage({ params }: Props) {
  return (
    <Page>
      <Suspense fallback={<Skeleton className="mb-4 h-5 w-16" />}>
        <WarehousesChrome params={params} />
      </Suspense>
      <Suspense fallback={<CardsSkeleton />}>
        <WarehousesData params={params} />
      </Suspense>
    </Page>
  )
}

async function WarehousesChrome({ params }: Props) {
  const { orgSlug } = await params
  return (
    <>
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
    </>
  )
}

export async function WarehousesData({ params }: Props) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s warehouses. Please try
        again.
      </div>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const warehouses = await service.warehouses.list({ tenantId })

  // The warehouse form redirects here, so a warehouse whose core mirror failed
  // would otherwise stay unlinked no matter how often this list is refreshed.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <WarehousesCards
      warehouses={warehouses}
      orgSlug={orgSlug}
      emptyState={
        <div className="876-empty-dashed max-w-2xl">No warehouses yet.</div>
      }
    />
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="876-card space-y-4 p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
