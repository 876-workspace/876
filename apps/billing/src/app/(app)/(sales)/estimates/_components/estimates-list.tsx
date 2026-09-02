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

import { documentStatusVariant } from '@/lib/status'
import { EstimatesTable } from './estimates-table'

type EstimateRow = ComponentProps<typeof EstimatesTable>['estimates'][number]

type Props = {
  estimates: EstimateRow[]
  emptyState?: ReactNode
}

export function EstimatesList({ estimates, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole estimate set, so this narrows what was fetched either way.
  const status = searchParams.get('status')
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status ?? '')
    ? status!
    : 'all'
  const rows =
    selectedStatus === 'all'
      ? estimates
      : estimates.filter(
          (estimate) => estimate.status.toLowerCase() === selectedStatus
        )

  if (!selectedId)
    return <EstimatesTable estimates={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Estimates</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No estimates yet</ListPaneEmpty>
        ) : (
          rows.map((estimate) => (
            <ListPaneItem
              key={estimate.id}
              href={
                query
                  ? `/estimates/${estimate.id}?${query}`
                  : `/estimates/${estimate.id}`
              }
              selected={estimate.id === selectedId}
              label={`View estimate ${estimate.number}`}
              title={estimate.number}
              subtitle={estimate.customer.name}
              trailing={
                <Badge variant={documentStatusVariant(estimate.status)}>
                  <span className="capitalize">
                    {estimate.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
