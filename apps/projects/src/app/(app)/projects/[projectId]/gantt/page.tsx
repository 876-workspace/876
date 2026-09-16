import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { GanttData } from '@/features/projects/components/gantt-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Gantt' }

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ baselineId?: string }>
}

export default async function ProjectGanttPage({
  params,
  searchParams,
}: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params
  const { baselineId } = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <ResourceToolbar
        title="Gantt"
        description="Planned dates and actuals"
        refresh
      />
      <Suspense fallback={<Skeleton className="mt-4 h-80 w-full" />}>
        <GanttData
          orgId={orgId}
          projectId={projectId}
          baselineId={baselineId}
        />
      </Suspense>
    </div>
  )
}
