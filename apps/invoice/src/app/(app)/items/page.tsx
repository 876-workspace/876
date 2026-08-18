import { CircleStackIcon } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { redirect } from 'next/navigation'

import { getInvoiceBillingIntegration } from '@/lib/876/billing-integration'
import { getInvoiceContext } from '@/lib/auth/context'
import { ItemsTable } from './_components/items-table'

export const metadata = {
  title: 'Items',
  description: 'Catalog items and services.',
}

const ITEM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

type Props = { searchParams: Promise<{ status?: string }> }

export default async function ItemsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value={selectedStatus}
            options={ITEM_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/items/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Item', cell: 'avatar' as const },
              { label: 'Default price' },
              { label: 'Tax' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <ItemsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function ItemsTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getInvoiceBillingIntegration()
  const result = await billing.items.list(
    context.orgId,
    selectedStatus === 'all'
      ? {}
      : { active: selectedStatus === 'active' }
  )

  if (result.error) {
    return (
      <ItemsTable
        items={[]}
        defaultCurrency="JMD"
        emptyState={<ItemsEmptyState />}
      />
    )
  }

  const items = result.data.data.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    sku: item.sku,
    unit: item.unit,
    defaultSellingAmount: item.defaultSellingAmount,
    defaultSellingCurrency: item.defaultSellingCurrency,
    isTaxable: item.isTaxable,
    isActive: item.isActive,
  }))

  return (
    <ItemsTable
      items={items}
      defaultCurrency="JMD"
      emptyState={<ItemsEmptyState />}
    />
  )
}

function ItemsEmptyState() {
  return (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleStackIcon />
        </EmptyMedia>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>
          Add the goods or services you expect to quote and invoice.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/items/new" className={buttonVariants({ variant: 'info' })}>
          New
        </Link>
      </EmptyContent>
    </Empty>
  )
}
