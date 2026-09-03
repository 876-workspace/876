import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectDetailData } from '@/features/projects/components/project-detail-data'
import { projects } from '@/lib/services/projects'

import {
  PLATFORM_PROJECTS_BASE,
  requirePlatformProjectsOrgId,
} from '../../_lib/base'

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
      base={PLATFORM_PROJECTS_BASE}
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
