import { Suspense } from 'react'
import { Page } from '@876/ui/page'

import { LocationsCardsSkeleton } from '../_components/locations-cards-skeleton'
import { LocationsData } from '../_components/locations-data'
import { LocationsShell } from '../_components/locations-shell'

export const metadata = { title: 'Locations — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function LocationsSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <LocationsShell orgSlug={orgSlug} />
      <Suspense fallback={<LocationsCardsSkeleton />}>
        <LocationsData params={params} />
      </Suspense>
    </Page>
  )
}
