import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectTimeData } from '@/features/time/components/project-time-data'
import { TIME_ENTRY_SKELETON_COLUMNS } from '@/features/time/components/time-entry-rows'
import { projectTimeHref, withEntryParam } from '@/features/time/components/time-links'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Time' }

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ entry?: string }>
}

export default async function ProjectTimePage({
  params,
  searchParams,
}: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId, userId } = await requireProjectsContext()
  const { projectId } = await params
  const { entry } = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <ResourceToolbar
        title="Time"
        primaryLabel="Add"
        primaryHref={withEntryParam(projectTimeHref(projectId), 'new')}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TIME_ENTRY_SKELETON_COLUMNS} rows={6} />
        }
      >
        <ProjectTimeData
          orgId={orgId}
          userId={userId}
          projectId={projectId}
          entryParam={entry}
          canEdit={canAccess(access, 'projects.edit')}
        />
      </Suspense>
    </div>
  )
}
