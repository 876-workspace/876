import { ISSUES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IssuesData } from '@/features/projects/components/issues-data'
import {
  parseIssueFilters,
  type IssueSearchParams,
} from '@/features/projects/issue-filters'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Issues' }

type Props = { searchParams: Promise<IssueSearchParams> }

export default async function IssuesPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const filters = parseIssueFilters(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Issues"
        primaryLabel="Add"
        primaryHref="/issues/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <IssuesData
          query={filters.query}
          values={filters.values}
          groupBy={filters.groupBy}
        />
      </Suspense>
    </div>
  )
}
