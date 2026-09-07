'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import { ItemsTable, type ItemRow as ItemsTableRow } from '@876/billing-ui/items-table'

import { formatMoney } from '@/lib/format'

/** Billing holds an item's prices as rows; the table only needs how many. */
type ItemRow = Omit<ItemsTableRow, 'priceCount'> & { prices: unknown[] }

type Props = {
  items: ItemRow[]
  defaultCurrency: string
  emptyState?: ReactNode
}

export function ItemsList({ items, defaultCurrency, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status')
  const rows =
    status === 'active' || status === 'inactive'
      ? items.filter((row) =>
          status === 'active' ? row.isActive : !row.isActive
        )
      : items

  if (!selectedId)
    return (
      <ItemsTable
        items={rows.map(({ prices, ...item }) => ({
          ...item,
          priceCount: prices.length,
        }))}
        defaultCurrency={defaultCurrency}
        baseHref="/items"
        formatAmount={formatMoney}
        showPriceCount
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Items</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No items yet</ListPaneEmpty>
        ) : (
          rows.map((item) => (
            <ListPaneItem
              key={item.id}
              href={query ? `/items/${item.id}?${query}` : `/items/${item.id}`}
              selected={item.id === selectedId}
              label={`View item ${item.name}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {item.name}
                </span>
              }
              subtitle={item.sku}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
