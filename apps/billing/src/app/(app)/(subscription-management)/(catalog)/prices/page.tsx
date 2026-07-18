import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { PricesTable } from './prices-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Prices',
  description: 'Pricing records and configurations.',
}

const PRICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Prices' },
  { value: 'active', label: 'Active', headingLabel: 'Active Prices' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Prices' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function PricesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const prices = await service.prices.list(context.tenant.id, filterStatus)

  return (
    <Page>
      <ResourceToolbar
        title="Prices"
        titleFilter={
          <StatusFilterHeading
            label="Prices"
            value={selectedStatus}
            options={PRICE_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('catalog:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('catalog:write')
            ? '/prices/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

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
    </Page>
  )
}
