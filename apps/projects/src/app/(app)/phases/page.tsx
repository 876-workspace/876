import { PHASES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PhaseListData } from '@/features/projects/components/phase-list-data'
import { parsePhaseFilters } from '@/features/projects/phase-filters'
import { requireAppAccess } from '@/lib/auth/require-projects-context'
import type { PhaseSearchParams } from '@/types/planning'

export const metadata: Metadata = { title: 'Phases' }

type Props = { searchParams: Promise<PhaseSearchParams> }

export default async function PhasesPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const filters = parsePhaseFilters(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Phases"
        primaryLabel="Add"
        primaryHref="/phases/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PHASES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <PhaseListData project={filters.project} status={filters.status} />
      </Suspense>
    </div>
  )
}
