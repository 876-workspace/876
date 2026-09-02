'use client'

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

import { PriceListsTable, type PriceListRow } from './price-lists-table'

/**
 * The list column for every `/price-lists` route: the full table on its own,
 * and a condensed pane once a price list opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function PriceListsList({ lists }: { lists: PriceListRow[] }) {
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
      ? lists.filter((row) => row.isActive === (status === 'active'))
      : lists

  if (!selectedId)
    return rows.length ? (
      <PriceListsTable lists={rows} />
    ) : (
      <div className="876-card text-muted-foreground p-10 text-center text-sm">
        No price lists match this view.
      </div>
    )

  return (
    <ListPane>
      <ListPaneHeader>Price Lists</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No price lists match this view</ListPaneEmpty>
        ) : (
          rows.map((row) => (
            <ListPaneItem
              key={row.id}
              href={
                query
                  ? `/price-lists/${row.id}?${query}`
                  : `/price-lists/${row.id}`
              }
              selected={row.id === selectedId}
              label={`View price list ${row.name}`}
              title={row.name}
              subtitle={row.mode.toLowerCase()}
              trailing={
                row.isActive ? null : (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 py-0 text-[0.625rem]"
                  >
                    Archived
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
