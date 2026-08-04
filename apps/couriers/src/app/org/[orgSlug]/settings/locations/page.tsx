import { Suspense } from 'react'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { LocationsData } from './_components/locations-data'

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
