import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { PricesTable } from '@/features/catalog/components/prices-table'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = {
  title: 'Prices',
  description: 'Pricing records and configurations.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function PricesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.prices} status={selectedStatus}>
      <PricesPageData selectedStatus={selectedStatus} />
    </StreamingResourcePage>
  )
}

async function PricesPageData({ selectedStatus }: { selectedStatus: string }) {
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const prices = await service.prices.list(context.tenant.id, filterStatus)

  return (
    <PricesTable
      prices={prices}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>No prices yet</EmptyTitle>
            <EmptyDescription>
              Add a currency-specific price to an item or plan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
