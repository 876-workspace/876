import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PreAlertsListData } from './_components/pre-alerts-list-data'
import { PreAlertsSection } from './_components/pre-alerts-section'
import { PRE_ALERTS_SKELETON_COLUMNS } from './_components/pre-alerts-skeleton-columns'

export const metadata = { title: 'Pre-alerts' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the pre-alert list for every route under
 * `/packages/pre-alerts`, so a pre-alert opens beside the list instead of
 * replacing it. Awaits `params` only; the list streams behind its own boundary.
 */
export default async function PreAlertsLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <PreAlertsSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={PRE_ALERTS_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
          }
        >
          <PreAlertsListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </PreAlertsSection>
  )
}
