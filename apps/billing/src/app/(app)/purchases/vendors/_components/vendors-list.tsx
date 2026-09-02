'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import { VendorsTable } from './vendors-table'

type VendorRow = ComponentProps<typeof VendorsTable>['vendors'][number]

type Props = {
  vendors: VendorRow[]
  emptyState?: ReactNode
}

export function VendorsList({ vendors, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole vendor set, so this narrows what was fetched either way.
  const status = searchParams.get('status')
  const rows =
    status === 'active' || status === 'archived'
      ? vendors.filter((vendor) => vendor.status === status.toUpperCase())
      : vendors

  if (!selectedId) return <VendorsTable vendors={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Vendors</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No vendors yet</ListPaneEmpty>
        ) : (
          rows.map((vendor) => (
            <ListPaneItem
              key={vendor.id}
              href={
                query
                  ? `/purchases/vendors/${vendor.id}?${query}`
                  : `/purchases/vendors/${vendor.id}`
              }
              selected={vendor.id === selectedId}
              label={`View vendor ${vendor.name}`}
              title={vendor.name}
              subtitle={vendor.email ?? vendor.phone ?? vendor.reference}
              trailing={
                <Badge
                  variant={
                    vendor.status === 'ACTIVE' ? 'success' : 'secondary'
                  }
                >
                  {vendor.status.toLowerCase()}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
