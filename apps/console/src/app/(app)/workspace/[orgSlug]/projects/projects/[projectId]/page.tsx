import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProjectDetailData } from '@/features/projects/components/project-detail-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Project' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Project' }

  return {
    title: `${result.data.name} (${result.data.key}) • Projects - Organizations`,
  }
}

export default async function OrganizationProjectDetailPage({ params }: Props) {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <Suspense fallback={<ProjectDetailFallback />}>
        <ProjectDetailData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
        />
      </Suspense>
    </>
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
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
