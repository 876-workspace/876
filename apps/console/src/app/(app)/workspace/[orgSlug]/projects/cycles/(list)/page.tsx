import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { CyclesData } from '@/features/projects/components/cycles-data'
import {
  isCycleStatus,
  CYCLE_STATUS_OPTIONS,
} from '@/features/projects/cycle-status'
import { CYCLES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ project?: string; status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Cycles' }

  return { title: `${org.name ?? org.slug} • Cycles - Organizations` }
}

export default async function OrganizationCyclesPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const { project, status } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar
        title="Cycles"
        titleFilter={
          <StatusFilterHeading
            label="Cycles"
            value={isCycleStatus(status) ? status : 'all'}
            options={CYCLE_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CYCLES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CyclesData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={project?.trim() || undefined}
          status={isCycleStatus(status) ? status : undefined}
        />
      </Suspense>
    </div>
  )
}
