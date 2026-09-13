import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { SalesOrdersListData } from './_components/sales-orders-list-data'
import { SalesOrdersSection } from './_components/sales-orders-section'

export default async function SalesOrdersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('sales-orders:read')
  return (
    <SalesOrdersSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={[
                { label: 'Order', cell: 'avatar' },
                { label: 'Customer' },
                { label: 'Amount' },
                { label: 'Status', cell: 'badge' },
              ]}
              rows={5}
            />
          }
        >
          <SalesOrdersListData />
        </Suspense>
      }
    >
      {children}
    </SalesOrdersSection>
  )
}
