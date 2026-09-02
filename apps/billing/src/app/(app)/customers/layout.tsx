import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import { CustomersListData } from './_components/customers-list-data'
import { CustomersSection } from './_components/customers-section'

/**
 * Owns the toolbar and the customer list for every route under `/customers`.
 *
 * Keeping them here — rather than in each page — is what lets a customer open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function CustomersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('customers:read')

  return (
    <CustomersSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <CustomersListData />
        </Suspense>
      }
    >
      {children}
    </CustomersSection>
  )
}
