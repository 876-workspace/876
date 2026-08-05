'use client'

import { useParams } from 'next/navigation'
import { Page } from '@876/ui/page'

import { WarehousesCardsSkeleton } from '../_components/warehouses-cards-skeleton'
import { WarehousesShell } from '../_components/warehouses-shell'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <WarehousesShell orgSlug={orgSlug} />
      <WarehousesCardsSkeleton />
    </Page>
  )
}
