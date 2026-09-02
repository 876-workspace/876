import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { SubscriptionsListData } from './_components/subscriptions-list-data'
import { SubscriptionsSection } from './_components/subscriptions-section'

const COLUMNS = [
  { label: 'Customer', cell: 'avatar' as const },
  { label: 'Product & plan' },
  { label: 'Recurring amount' },
  { label: 'Status', cell: 'badge' as const },
  { label: 'Renews / ends' },
  { label: 'Created' },
]

export default async function SubscriptionsLayout({
  children,
}: {
  children: ReactNode
}) {
  // The parent `(subscription-management)` layout already gates the feature;
  // this is the section's own permission, which a feature flag never replaces.
  await requirePagePermission('subscriptions:read')

  return (
    <SubscriptionsSection
      list={
        <Suspense fallback={<DataTableSkeleton columns={COLUMNS} rows={5} />}>
          <SubscriptionsListData />
        </Suspense>
      }
    >
      {children}
    </SubscriptionsSection>
  )
}
