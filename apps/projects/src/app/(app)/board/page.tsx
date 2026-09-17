import type { IssueBoardGroupBy } from '@876/projects-ui/issue-board'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BoardData } from '@/features/projects/components/board-data'
import { parseIssueFilters } from '@/features/projects/issue-filters'
import { requireAppAccess } from '@/lib/auth/require-projects-context'
import type { IssueSearchParams } from '@/types/issues'

export const metadata: Metadata = { title: 'Board' }

type Props = { searchParams: Promise<IssueSearchParams> }

export default async function BoardPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const filters = parseIssueFilters(await searchParams, 'status')
  const groupBy: IssueBoardGroupBy =
    filters.groupBy === 'none' ? 'status' : filters.groupBy

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
        <BoardData
          query={filters.query}
          values={filters.values}
          groupBy={groupBy}
        />
      </Suspense>
    </div>
  )
}
