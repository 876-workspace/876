import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { ProjectActivityData } from '@/features/projects/components/activity-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/services/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
  searchParams: Promise<{ cursor?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Activity' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Activity' }

  return { title: `${result.data.name} • Activity - Organizations` }
}

export default async function OrganizationProjectActivityPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug, projectId } = await params
  const { cursor } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Activity" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectActivityData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
          cursor={cursor}
        />
      </Suspense>
    </>
  )
}
