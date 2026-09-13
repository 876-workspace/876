import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import { CustomersListData } from './_components/customers-list-data'
import { CustomersSection } from './_components/customers-section'

export const metadata = { title: 'Customers' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the customer list for every route under `/customers`,
 * so a customer opens beside the list instead of replacing it. Awaits `params`
 * only; the list streams behind its own boundary.
 */
export default async function CustomersLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <CustomersSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={CUSTOMERS_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
          }
        >
          <CustomersListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </CustomersSection>
  )
}
