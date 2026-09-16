import { Skeleton } from '@876/ui/skeleton'
import { Page } from '@876/ui/page'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectDetailData } from '@/features/projects/components/project-detail-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Project' }

  return { title: `${result.data.name} (${result.data.key}) • Projects` }
}

export default async function PlatformProjectDetailPage({ params }: Props) {
  const { projectId } = await params

  return (
    <Page>
      <ProjectTabs base={projectsBase(null)} projectId={projectId} />
      <Suspense fallback={<ProjectDetailFallback />}>
        <ProjectDetailSection projectId={projectId} />
      </Suspense>
    </Page>
  )
}

async function ProjectDetailSection({ projectId }: { projectId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
    />
  )
}

function ProjectDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, tile) => (
          <Skeleton key={tile} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
