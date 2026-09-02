'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

import { formatMoney } from '@/lib/format'
import { ItemsTable, type ItemRow } from '@876/billing-ui/items-table'

/**
 * The list column for every `/items` route: the full table on its own, and a
 * condensed pane once an item opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function ItemsList({
  items,
  defaultCurrency,
  emptyState,
}: {
  items: ItemRow[]
  defaultCurrency: string
  emptyState?: ReactNode
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record.
  const status = searchParams.get('status')
  const rows =
    status === 'active' || status === 'inactive'
      ? items.filter((item) => item.isActive === (status === 'active'))
      : items

  if (!selectedId)
    return (
      <ItemsTable
        items={rows}
        defaultCurrency={defaultCurrency}
        baseHref="/items"
        formatAmount={formatMoney}
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
              title={item.name}
              subtitle={item.sku ?? item.type}
              trailing={
                item.isActive ? (
                  item.defaultSellingAmount ? (
                    <span className="tabular-nums">
                      {formatMoney(
                        item.defaultSellingAmount,
                        item.defaultSellingCurrency ?? defaultCurrency
                      )}
                    </span>
                  ) : null
                ) : (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 py-0 text-[0.625rem]"
                  >
                    Inactive
                  </Badge>
                )
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
