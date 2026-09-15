import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CycleListData } from '@/features/projects/components/cycle-list-data'
import {
  CYCLE_STATUS_OPTIONS,
  parseCycleFilters,
  type CycleSearchParams,
} from '@/features/projects/cycle-filters'
import { CYCLES_SKELETON_COLUMNS } from '@/features/projects/components/cycle-skeleton-columns'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Cycles' }

type Props = { searchParams: Promise<CycleSearchParams> }

export default async function CyclesPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const filters = parseCycleFilters(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Cycles"
        titleFilter={
          <StatusFilterHeading
            label="Cycles"
            value={filters.values.status}
            options={CYCLE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/cycles/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CYCLES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <CycleListData project={filters.project} status={filters.status} />
      </Suspense>
    </div>
  )
}
