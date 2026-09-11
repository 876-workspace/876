import type { ReactNode } from 'react'
import { Suspense } from 'react'
import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { WidgetsListData } from './_components/widgets-list-data'
import { WidgetsSection } from './_components/widgets-section'

const WIDGETS_SKELETON_COLUMNS = [
  { label: 'Widget', cell: 'avatar' },
  { label: 'Apps' },
  { label: 'Status' },
  { label: '' },
] satisfies DataTableSkeletonColumn[]

/**
 * Owns the toolbar and the widget list for every route under `/widgets`.
 *
 * Keeping them here — rather than in each page — is what lets a widget open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function WidgetsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/widgets')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/widgets'])

  return (
    <WidgetsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={WIDGETS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <WidgetsListData />
        </Suspense>
      }
    >
      {children}
    </WidgetsSection>
  )
}
