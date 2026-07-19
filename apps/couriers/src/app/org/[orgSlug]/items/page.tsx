import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CircleStackIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'

import { ItemsTable } from './items-table'

const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function ItemsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'
  const activeFilter =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const items = await finance.items.list(ctx.orgId, {
    active: activeFilter,
  })

  const rows = items.error
    ? []
    : items.data.data.map((item) => ({
        id: item.id,
        name: item.name,
        subtitle: item.sku ?? item.description ?? item.id,
        type: item.type,
        origin: item.source ? 'Connected app' : 'Billing workspace',
        priceLabel: formatPrice(
          item.defaultSellingAmount,
          item.defaultSellingCurrency
        ),
      }))

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No shared catalog items in this finance workspace yet.'
      : `No ${selectedStatus} items.`

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
        refresh
      />

      {items.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-sm">
          {items.error.message}
        </div>
      ) : null}

      <ItemsTable
        items={rows}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleStackIcon />
              </EmptyMedia>
              <EmptyTitle>No items</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}

function formatPrice(amount: string | null, currency: string | null): string {
  if (amount === null || currency === null) return '—'
  const numeric = Number(amount)
  if (!Number.isSafeInteger(numeric)) return `${currency} ${amount}`

  const formatter = new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency,
  })
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(numeric / 10 ** exponent)
}
