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

import type { ProductRow } from './products-table'
import { ProductsTable } from './products-table'
import { parseCatalogStatus } from '../../_components/catalog-list-config'

type Props = {
  products: ProductRow[]
  emptyState?: ReactNode
}

export function ProductsList({ products, emptyState }: Props) {
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
      ? products
      : products.filter((row) => row.isActive === filterStatus)

  if (!selectedId)
    return <ProductsTable products={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Products</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No products yet</ListPaneEmpty>
        ) : (
          rows.map((product) => (
            <ListPaneItem
              key={product.id}
              href={
                query
                  ? `/products/${product.id}?${query}`
                  : `/products/${product.id}`
              }
              selected={product.id === selectedId}
              label={`View product ${product.name}`}
              title={product.name}
              subtitle={product.slug}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
