import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectGanttData } from '@/features/projects/components/project-gantt-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ baselineId?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Gantt' }

  return { title: `${result.data.name} • Gantt - Projects` }
}

export default async function PlatformProjectGanttPage({
  params,
  searchParams,
}: Props) {
  const { projectId } = await params
  const { baselineId } = await searchParams
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Gantt" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectGanttSection projectId={projectId} baselineId={baselineId} />
      </Suspense>
    </Page>
  )
}

async function ProjectGanttSection({
  projectId,
  baselineId,
}: {
  projectId: string
  baselineId: string | undefined
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectGanttData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
      baselineId={baselineId?.trim() || undefined}
    />
  )
}
