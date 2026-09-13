import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { DELIVERIES_SKELETON_COLUMNS } from './_components/deliveries-skeleton-columns'
import { DeliveriesListData } from './_components/deliveries-list-data'
import { DeliveriesSection } from './_components/deliveries-section'

export const metadata = { title: 'Deliveries' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the delivery list for every route under `/deliveries`,
 * so a delivery opens beside the list instead of replacing it. Awaits `params`
 * only; the list streams behind its own boundary.
 */
export default async function DeliveriesLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <DeliveriesSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={DELIVERIES_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
          }
        >
          <DeliveriesListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </DeliveriesSection>
  )
}
