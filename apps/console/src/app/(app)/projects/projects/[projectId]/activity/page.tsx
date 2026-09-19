import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectActivityData } from '@/features/projects/components/activity-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ cursor?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Activity' }

  return { title: `${result.data.name} • Activity - Projects` }
}

export default async function PlatformProjectActivityPage({
  params,
  searchParams,
}: Props) {
  const { projectId } = await params
  const { cursor } = await searchParams
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Activity" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectActivitySection projectId={projectId} cursor={cursor} />
      </Suspense>
    </Page>
  )
}

async function ProjectActivitySection({
  projectId,
  cursor,
}: {
  projectId: string
  cursor: string | undefined
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectActivityData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
      cursor={cursor}
    />
  )
}
