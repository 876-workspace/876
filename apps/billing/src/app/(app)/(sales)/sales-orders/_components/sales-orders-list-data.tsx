import type { ComponentProps } from 'react'
import { ClipboardList } from '@876/ui/icons'
import { AppError } from '@876/ui/app-error'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { SalesOrdersList } from './sales-orders-list'

export async function SalesOrdersListData() {
  const context = await getWorkspaceContext()
  if (!context) return null
  let orders: ComponentProps<typeof SalesOrdersList>['orders'] = []
  let error: { code: string; message: string } | null = null
  try {
    orders = (await service.salesOrders.list(
      context.tenant.id
    )) as ComponentProps<typeof SalesOrdersList>['orders']
  } catch {
    error = {
      code: 'billing/sales-orders-unavailable',
      message: 'Sales orders could not be loaded.',
    }
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {error ? (
        <AppError
          title="Sales orders unavailable"
          error={error}
          variant="banner"
        />
      ) : null}
      <SalesOrdersList
        orders={orders}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No sales orders yet</EmptyTitle>
              <EmptyDescription>
                Create a draft commercial commitment to get started.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
