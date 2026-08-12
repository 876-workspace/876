import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'

import { CouponsTable } from '../_components/coupons-table'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = { title: 'Coupons' }

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selected = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.coupons} status={selected}>
      <CouponsPageData selected={selected} />
    </StreamingResourcePage>
  )
}

async function CouponsPageData({ selected }: { selected: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null
  const coupons = await service.discounts.coupons.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  return coupons.length ? (
    <CouponsTable coupons={coupons} />
  ) : (
    <div className="876-card text-muted-foreground p-10 text-center text-sm">
      No coupons match this view.
    </div>
  )
}
