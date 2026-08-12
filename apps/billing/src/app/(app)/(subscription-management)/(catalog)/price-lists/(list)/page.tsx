import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'

import { PriceListsTable } from '../_components/price-lists-table'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = { title: 'Price Lists' }
export default async function PriceListsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selected = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.priceLists} status={selected}>
      <PriceListsPageData selected={selected} />
    </StreamingResourcePage>
  )
}

async function PriceListsPageData({ selected }: { selected: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null
  const lists = await service.priceLists.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  return lists.length ? (
    <PriceListsTable lists={lists} />
  ) : (
    <div className="876-card text-muted-foreground p-10 text-center text-sm">
      No price lists match this view.
    </div>
  )
}
