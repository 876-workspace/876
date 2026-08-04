import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CircleStackIcon } from '@876/ui/icons'
import { get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'

import { ItemsTable } from './items-table'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function ItemsTableData({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'
  const activeFilter =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const $876 = await get876Client()
  const items = await $876.billing.items.list(ctx.orgId, {
    active: activeFilter,
  })

  const rows = items.error
    ? []
    : items.data.data.map((item) => ({
        id: item.id,
        name: item.name,
        subtitle: item.sku ?? item.description ?? item.id,
        type: item.type,
        origin: item.sourceAppId ? 'Connected app' : 'Billing workspace',
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
    <>
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
    </>
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
