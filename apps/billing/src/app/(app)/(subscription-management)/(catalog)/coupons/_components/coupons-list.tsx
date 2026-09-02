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

import type { CouponRow } from './coupons-table'
import { CouponsTable } from './coupons-table'
import { parseCatalogStatus } from '../../_components/catalog-list-config'

type Props = {
  coupons: CouponRow[]
  emptyState?: ReactNode
}

export function CouponsList({ coupons, emptyState }: Props) {
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
      ? coupons
      : coupons.filter((row) => row.isActive === filterStatus)

  if (!selectedId)
    return rows.length ? <CouponsTable coupons={rows} /> : emptyState

  return (
    <ListPane>
      <ListPaneHeader>Coupons</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No coupons yet</ListPaneEmpty>
        ) : (
          rows.map((coupon) => (
            <ListPaneItem
              key={coupon.id}
              href={
                query
                  ? `/coupons/${coupon.id}?${query}`
                  : `/coupons/${coupon.id}`
              }
              selected={coupon.id === selectedId}
              label={`View coupon ${coupon.name}`}
              title={coupon.name}
              subtitle={
                coupon.duration === 'REPEATING'
                  ? `${coupon.durationInCycles ?? 0} cycles`
                  : coupon.duration.toLowerCase()
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
