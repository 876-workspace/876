'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { ItemsTable, type ItemRow } from '@876/billing-ui/items-table'

import { formatMoney } from '@/lib/finance/format'

import { resolveItemStatusFilter } from '../_lib/items-list-config'

type Props = {
  items: ItemRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/**
 * The list column: the full table while no item is open, and a condensed pane
 * once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 *
 * The formatter is a function, so it cannot cross the RSC boundary as a prop;
 * this client adapter binds Couriers' money policy and routes to the shared
 * table.
 */
export function ItemsList({ items, orgSlug, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because the list
  // lives in the layout, which receives no `searchParams`; the data half
  // already loads every shared-catalog item.
  const status = resolveItemStatusFilter(searchParams.get('status'))
  const rows =
    status === 'all'
      ? items
      : items.filter((item) => item.isActive === (status === 'active'))

  if (segments.length === 0)
    return (
      <ItemsTable
        items={rows}
        defaultCurrency="JMD"
        baseHref={`/${orgSlug}/items`}
        formatAmount={formatMoney}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/items`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No items</ListPaneEmpty>
        ) : (
          rows.map((item) => (
            <ListPaneItem
              key={item.id}
              href={
                query
                  ? `${baseHref}/${item.id}?${query}`
                  : `${baseHref}/${item.id}`
              }
              selected={item.id === selectedId}
              label={`View item ${item.name}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {item.name}
                </span>
              }
              subtitle={item.sku ?? item.unit ?? item.type.toLowerCase()}
              trailing={
                <Badge variant={item.isActive ? 'success' : 'secondary'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
