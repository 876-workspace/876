import { Suspense } from 'react'
import type { ReactNode } from 'react'

import { requireAppPermission } from '@/lib/auth/require-crm-context'

import { CustomerListData } from './_components/customer-list-data'
import { CustomerListSkeleton } from './_components/customer-list-skeleton'
import { CustomersShell } from './_components/customers-shell'

/**
 * Owns the toolbar and the customer list for every route under `/customers`.
 *
 * Keeping them in the layout — rather than in each page — is what lets a tab
 * navigation re-render only the tab body, and what keeps the list column a
 * single element across open/close so its width can animate.
 */
export default async function CustomersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAppPermission('customers.view')

  return (
    <CustomersShell
      list={
        <Suspense fallback={<CustomerListSkeleton />}>
          <CustomerListData />
        </Suspense>
      }
    >
      {children}
    </CustomersShell>
  )
}
