import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'

import { ProjectDiscussionsData } from '@/features/projects/components/discussions-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/services/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Discussions' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Discussions' }

  return { title: `${result.data.name} • Discussions - Organizations` }
}

export default async function OrganizationProjectDiscussionsPage({
  params,
}: Props) {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Discussions" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectDiscussionsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
        />
      </Suspense>
    </>
  )
}
