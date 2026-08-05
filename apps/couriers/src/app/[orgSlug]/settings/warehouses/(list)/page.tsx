import { Suspense } from 'react'
import { Page } from '@876/ui/page'

import { WarehousesCardsSkeleton } from '../_components/warehouses-cards-skeleton'
import { WarehousesData } from '../_components/warehouses-data'
import { WarehousesShell } from '../_components/warehouses-shell'

export const metadata = { title: 'Warehouses — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function WarehousesSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <WarehousesShell orgSlug={orgSlug} />
      <Suspense fallback={<WarehousesCardsSkeleton />}>
        <WarehousesData params={params} />
      </Suspense>
    </Page>
  )
}
