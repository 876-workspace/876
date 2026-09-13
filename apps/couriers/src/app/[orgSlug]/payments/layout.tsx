import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PAYMENTS_SKELETON_COLUMNS } from './_components/payments-skeleton-columns'
import { PaymentsListData } from './_components/payments-list-data'
import { PaymentsSection } from './_components/payments-section'

export const metadata = { title: 'Payments' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the payment list for every route under `/payments`,
 * so a payment opens beside the list instead of replacing it. Awaits `params`
 * only; the list streams behind its own boundary.
 */
export default async function PaymentsLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <PaymentsSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={PAYMENTS_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <PaymentsListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </PaymentsSection>
  )
}
