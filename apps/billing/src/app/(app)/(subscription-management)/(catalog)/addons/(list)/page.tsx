import { CircleStackIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'

import { AddonsTable } from '@/features/catalog/components/addons-table'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = { title: 'Add-ons' }
export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selected = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.addons} status={selected}>
      <AddonsPageData selected={selected} />
    </StreamingResourcePage>
  )
}

async function AddonsPageData({ selected }: { selected: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null
  const addons = await service.addons.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  return (
    <AddonsTable
      addons={addons}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleStackIcon />
            </EmptyMedia>
            <EmptyTitle>No add-ons yet</EmptyTitle>
            <EmptyDescription>
              Add modular recurring or one-time services to your plans.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
