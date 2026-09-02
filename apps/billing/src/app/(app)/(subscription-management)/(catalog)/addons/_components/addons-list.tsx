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

import type { AddonRow } from '@/features/catalog/components/addons-table'
import { AddonsTable } from '@/features/catalog/components/addons-table'
import { parseCatalogStatus } from '../../_components/catalog-list-config'

type Props = {
  addons: AddonRow[]
  emptyState?: ReactNode
}

export function AddonsList({ addons, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = parseCatalogStatus(searchParams.get('status') ?? undefined)
  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole resource set, so this narrows what was fetched either way.
  const filterStatus = status === 'all' ? undefined : status === 'active'
  const rows =
    filterStatus === undefined
      ? addons
      : addons.filter((row) => row.isActive === filterStatus)

  if (!selectedId) return <AddonsTable addons={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Add-ons</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No add-ons yet</ListPaneEmpty>
        ) : (
          rows.map((addon) => (
            <ListPaneItem
              key={addon.id}
              href={
                query ? `/addons/${addon.id}?${query}` : `/addons/${addon.id}`
              }
              selected={addon.id === selectedId}
              label={`View add-on ${addon.name}`}
              title={addon.name}
              subtitle={addon.code}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
