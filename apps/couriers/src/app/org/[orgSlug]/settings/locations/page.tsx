import { Suspense } from 'react'
import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { LocationsCards } from './_components/locations-cards'

export const metadata = { title: 'Locations — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default function LocationsSettingsPage({ params }: Props) {
  return (
    <Page>
      <Suspense fallback={<Skeleton className="mb-4 h-5 w-16" />}>
        <LocationsChrome params={params} />
      </Suspense>
      <Suspense fallback={<CardsSkeleton />}>
        <LocationsData params={params} />
      </Suspense>
    </Page>
  )
}

async function LocationsChrome({ params }: Props) {
  const { orgSlug } = await params
  return (
    <>
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
    </>
  )
}

export async function LocationsData({ params }: Props) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s branches. Please try
        again.
      </div>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const branches = await service.branches.list({ tenantId })

  // Opportunistic repair for sites whose core mirror failed at write time. It
  // runs after the response so a slow identity API never delays this page.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <LocationsCards
      branches={branches}
      orgSlug={orgSlug}
      emptyState={
        <div className="876-empty-dashed max-w-2xl">No branches yet.</div>
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
