import { Page } from '@876/ui/page'
import { Suspense } from 'react'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { BillingListPageSkeleton } from '@/components/patterns/billing-page-skeleton'
import { service } from '@/lib/service'

import { PriceListsTable } from '../_components/price-lists-table'

export const metadata = { title: 'Price Lists' }
const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Price Lists' },
  { value: 'active', label: 'Active', headingLabel: 'Active Price Lists' },
  {
    value: 'inactive',
    label: 'Archived',
    headingLabel: 'Archived Price Lists',
  },
]

export default function PriceListsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  return (
    <Suspense fallback={<BillingListPageSkeleton />}>
      <PriceListsPageData searchParams={searchParams} />
    </Suspense>
  )
}

async function PriceListsPageData({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const selected = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const context = await getWorkspaceContext()
  if (!context) return null
  const lists = await service.priceLists.list(
    context.tenant.id,
    selected === 'all' ? undefined : selected === 'active'
  )
  const canWrite = context.permissions.includes('catalog:write')
  return (
    <Page>
      <ResourceToolbar
        title="Price Lists"
        titleFilter={
          <StatusFilterHeading
            label="Price lists"
            value={selected}
            options={OPTIONS}
          />
        }
        primaryLabel={canWrite ? 'Add' : undefined}
        primaryHref={canWrite ? '/price-lists/new' : undefined}
        primaryVariant="info"
        refresh
      />
      {lists.length ? (
        <PriceListsTable lists={lists} />
      ) : (
        <div className="876-card text-muted-foreground p-10 text-center text-sm">
          No price lists match this view.
        </div>
      )}
    </Page>
  )
}
