import { CircleStackIcon } from '@876/ui/icons'
import Link from 'next/link'
import { Suspense, type ComponentProps } from 'react'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ItemsTable } from '../_components/items-table'
import { ITEMS_SKELETON_COLUMNS } from '../_components/items-skeleton-columns'
import { ItemsToolbar } from '../_components/items-toolbar'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Items',
  description: 'Catalog items and services.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function ItemsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'

  return (
    <Page>
      <ItemsToolbar status={selectedStatus} />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} rows={5} />
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
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const items = await service.items.list(context.tenant.id, filterStatus)

  return (
    <ItemsTable
      items={items as unknown as ComponentProps<typeof ItemsTable>['items']}
      defaultCurrency={context.tenant.defaultCurrency}
      emptyState={
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
          {context.permissions.includes('catalog:write') ? (
            <EmptyContent>
              <Link
                href="/items/new"
                className={buttonVariants({ variant: 'info' })}
              >
                Add item
              </Link>
            </EmptyContent>
          ) : null}
        </Empty>
      }
    />
  )
}
