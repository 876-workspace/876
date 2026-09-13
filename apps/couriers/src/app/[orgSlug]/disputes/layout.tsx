import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { DisputesListData } from './_components/disputes-list-data'
import { DisputesSection } from './_components/disputes-section'
import { DISPUTES_SKELETON_COLUMNS } from './_components/disputes-skeleton-columns'

export const metadata = { title: 'Disputes' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the dispute list for every route under `/disputes`,
 * so a dispute opens beside the list instead of replacing it. Awaits `params`
 * only; the list streams behind its own boundary.
 */
export default async function DisputesLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <DisputesSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={DISPUTES_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <DisputesListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </DisputesSection>
  )
}
