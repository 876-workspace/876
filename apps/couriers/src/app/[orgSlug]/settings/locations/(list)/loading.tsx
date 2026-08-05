'use client'

import { useParams } from 'next/navigation'
import { Page } from '@876/ui/page'

import { LocationsCardsSkeleton } from '../_components/locations-cards-skeleton'
import { LocationsShell } from '../_components/locations-shell'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <LocationsShell orgSlug={orgSlug} />
      <LocationsCardsSkeleton />
    </Page>
  )
}
