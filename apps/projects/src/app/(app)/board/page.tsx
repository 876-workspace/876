import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BoardData } from '@/features/projects/components/board-data'
import { requireAppPermission } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Board' }

export default async function BoardPage() {
  await requireAppPermission('issues.view')

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Board"
        primaryLabel="Add"
        primaryHref="/issues/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, column) => (
              <Skeleton key={column} className="h-64 w-full" />
            ))}
          </div>
        }
      >
        <BoardData />
      </Suspense>
    </div>
  )
}
