import { CircleStackIcon } from '@876/ui/icons'
import Link from 'next/link'
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
import { ItemsTable } from './items-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Items',
  description: 'Catalog items and services.',
}

const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

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
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const items = await service.items.list(context.tenant.id, filterStatus)

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
        primaryLabel={
          context.permissions.includes('catalog:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('catalog:write')
            ? '/items/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <ItemsTable
        items={items}
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
    </Page>
  )
}
