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
import { SalesOrdersTable } from './sales-orders-table'

type OrderRow = ComponentProps<typeof SalesOrdersTable>['orders'][number]
export function SalesOrdersList({
  orders,
  emptyState,
}: {
  orders: OrderRow[]
  emptyState?: ReactNode
}) {
  const segments = useDetailSegments()
  const params = useSearchParams()
  const selectedId = segments[0] ?? null
  if (!selectedId)
    return <SalesOrdersTable orders={orders} emptyState={emptyState} />
  const query = params.toString()
  return (
    <ListPane>
      <ListPaneHeader>Sales Orders</ListPaneHeader>
      <ListPaneBody>
        {orders.length === 0 ? (
          <ListPaneEmpty>No sales orders yet</ListPaneEmpty>
        ) : (
          orders.map((order) => (
            <ListPaneItem
              key={order.id}
              href={
                query
                  ? `/sales-orders/${order.id}?${query}`
                  : `/sales-orders/${order.id}`
              }
              selected={order.id === selectedId}
              label={`View sales order ${order.number}`}
              title={order.number}
              subtitle={order.customerName ?? 'Unknown customer'}
              trailing={
                <Badge variant={documentStatusVariant(order.status)}>
                  <span className="capitalize">{order.status}</span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
