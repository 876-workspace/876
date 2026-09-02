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

import type { PriceRow } from '@/features/catalog/components/prices-table'
import { PricesTable } from '@/features/catalog/components/prices-table'
import { parseCatalogStatus } from '../../_components/catalog-list-config'
import { formatMoney } from '@/lib/format'

type Props = {
  prices: PriceRow[]
  emptyState?: ReactNode
}

export function PricesList({ prices, emptyState }: Props) {
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
      ? prices
      : prices.filter((row) => row.isActive === filterStatus)

  if (!selectedId) return <PricesTable prices={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Prices</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No prices yet</ListPaneEmpty>
        ) : (
          rows.map((price) => {
            const name =
              price.item?.name ??
              price.plan?.name ??
              price.addon?.name ??
              'Unknown target'
            const subtitle = price.item
              ? 'Item'
              : (price.plan?.product.name ?? price.addon?.product.name ?? '')

            return (
              <ListPaneItem
                key={price.id}
                href={
                  query ? `/prices/${price.id}?${query}` : `/prices/${price.id}`
                }
                selected={price.id === selectedId}
                label={`View price for ${name}`}
                title={name}
                subtitle={subtitle}
                trailing={formatMoney(price.unitAmount, price.currency)}
              />
            )
          })
        )}
      </ListPaneBody>
    </ListPane>
  )
}
