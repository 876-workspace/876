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

import { resolveDeliveryStatusFilter } from '../_lib/deliveries-list-config'
import {
  DeliveriesTable,
  deliveryStatusVariant,
  type DeliveryTableRow,
} from './deliveries-table'

type Props = {
  deliveries: DeliveryTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/**
 * The list column: the full table while no delivery is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 */
export function DeliveriesList({ deliveries, orgSlug, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // There is no deliveries retrieve yet, so the status filter narrows the rows
  // here. It is applied in this component rather than the query because the
  // list lives in the layout, which receives no `searchParams`.
  const status = resolveDeliveryStatusFilter(searchParams.get('status'))
  const rows =
    status === 'all'
      ? deliveries
      : deliveries.filter((row) => row.status === status)

  if (segments.length === 0)
    return <DeliveriesTable deliveries={rows} orgSlug={orgSlug} />

  const baseHref = `/${orgSlug}/deliveries`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>{emptyState ?? 'No deliveries'}</ListPaneEmpty>
        ) : (
          rows.map((delivery) => (
            <ListPaneItem
              key={delivery.id}
              href={
                query
                  ? `${baseHref}/${delivery.id}?${query}`
                  : `${baseHref}/${delivery.id}`
              }
              selected={delivery.id === selectedId}
              label={`View delivery ${delivery.code}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {delivery.code}
                </span>
              }
              subtitle={delivery.customerName}
              trailing={
                <Badge variant={deliveryStatusVariant(delivery.status)}>
                  {delivery.status}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
