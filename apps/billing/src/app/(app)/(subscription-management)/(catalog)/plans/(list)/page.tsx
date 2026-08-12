import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { PlansTable } from '@/features/catalog/components/plans-table'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = {
  title: 'Plans',
  description: 'Subscription plans and pricing.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function PlansPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.plans} status={selectedStatus}>
      <PlansPageData selectedStatus={selectedStatus} />
    </StreamingResourcePage>
  )
}

async function PlansPageData({ selectedStatus }: { selectedStatus: string }) {
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const plans = await service.plans.list(context.tenant.id, filterStatus)

  return (
    <PlansTable
      plans={plans}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No plans yet</EmptyTitle>
            <EmptyDescription>
              Create a product first, then add the plan cadence that customers
              can subscribe to.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
