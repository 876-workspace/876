import { Skeleton } from '@876/ui/skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProjectGanttData } from '@/features/projects/components/project-gantt-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
  searchParams: Promise<{ baselineId?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Gantt' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Gantt' }

  return { title: `${result.data.name} • Gantt - Organizations` }
}

export default async function OrganizationProjectGanttPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug, projectId } = await params
  const { baselineId } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Gantt" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectGanttData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
          baselineId={baselineId?.trim() || undefined}
        />
      </Suspense>
    </>
  )
}
