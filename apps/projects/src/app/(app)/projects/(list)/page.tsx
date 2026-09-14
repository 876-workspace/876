import {
  isProjectStatus,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilterStatus,
} from '@876/projects-ui/status-options'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectsData } from '@/features/projects/components/projects-data'
import { PROJECTS_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Projects' }

type Props = { searchParams: Promise<{ status?: string }> }

export default async function ProjectsPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { status } = await searchParams
  const selectedStatus: ProjectFilterStatus = isProjectStatus(status)
    ? status
    : 'all'

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Projects"
        titleFilter={
          <StatusFilterHeading
            label="Projects"
            value={selectedStatus}
            options={PROJECT_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/projects/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PROJECTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <ProjectsData status={selectedStatus} />
      </Suspense>
    </div>
  )
}
