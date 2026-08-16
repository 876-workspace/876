import { CircleStackIcon } from '@876/ui/icons'
import { Suspense } from 'react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading, type StatusFilterOption } from '@876/ui/status-filter-heading'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { redirect } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'
import { ItemsTable } from './_components/items-table'

export const metadata = { title: 'Items', description: 'Catalog items and services.' }

const ITEM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

type Props = { searchParams: Promise<{ status?: string }> }

export default async function ItemsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '') ? status! : 'all'
  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={<StatusFilterHeading label="Items" value={selectedStatus} options={ITEM_STATUS_OPTIONS} />}
        primaryLabel="New"
        primaryHref="/items/new"
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<DataTableSkeleton columns={[{ label: 'Item', cell: 'avatar' as const }, { label: 'Default price' }, { label: 'Tax' }, { label: 'Prices' }, { label: 'Status', cell: 'badge' as const }]} rows={5} />}>
        <ItemsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function ItemsTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '') ? status! : 'all'
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const $876 = await get876Client(context.orgId)
  const result = await $876.items.list().catch(() => ({ data: null, error: { code: 'unreachable' } } as const)) as unknown as { data: { data: unknown[] } | null, error: unknown | null }
  if (result.error || !result.data) {
    return (
      <ItemsTable
        items={[]}
        defaultCurrency="JMD"
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon"><CircleStackIcon /></EmptyMedia>
              <EmptyTitle>No items yet</EmptyTitle>
              <EmptyDescription>Add the goods or services you expect to quote and invoice.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/items/new" className={buttonVariants({ variant: 'info' })}>New</Link>
            </EmptyContent>
          </Empty>
        }
      />
    )
  }
  const items = (result.data.data as Record<string, unknown>[]).map((item) => ({
    id: String(item.id),
    name: String(item.name ?? 'Unnamed item'),
    type: String(item.type ?? 'GOODS'),
    sku: (item.sku as string) ?? null,
    unit: (item.unit as string) ?? null,
    defaultSellingAmount: (item.defaultSellingAmount as bigint) ?? (item.sellingPrice as string) ?? null,
    defaultSellingCurrency: (item.defaultSellingCurrency as string) ?? (item.currency as string) ?? null,
    isTaxable: Boolean(item.isTaxable ?? item.taxable ?? true),
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : String(item.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE',
    prices: (item.prices as unknown[]) ?? [],
  }))
  const filtered = selectedStatus === 'all' ? items : items.filter((i) => (selectedStatus === 'active' ? i.isActive : !i.isActive))
  return (
    <ItemsTable
      items={filtered}
      defaultCurrency={context.orgName ? 'JMD' : 'JMD'}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CircleStackIcon /></EmptyMedia>
            <EmptyTitle>No items yet</EmptyTitle>
            <EmptyDescription>Add the goods or services you expect to quote and invoice.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/items/new" className={buttonVariants({ variant: 'info' })}>New</Link>
          </EmptyContent>
        </Empty>
      }
    />
  )
}
