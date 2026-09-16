import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DiscussionThreadData } from '@/features/projects/components/discussions-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { projects } from '@/lib/services/projects'

type Props = {
  params: Promise<{ orgSlug: string; projectId: string; discussionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId, discussionId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Discussion' }

  const result = await projects.discussions.retrieve(
    org.id,
    projectId,
    decodeURIComponent(discussionId),
  )
  if (!result.data) return { title: 'Discussion' }

  return { title: `${result.data.title} • Discussions - Organizations` }
}

export default async function OrganizationDiscussionThreadPage({
  params,
}: Props) {
  const { orgSlug, projectId, discussionId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <Suspense fallback={<DiscussionThreadFallback />}>
        <DiscussionThreadData
          organizationId={org.id}
          projectId={projectId}
          discussionId={discussionId}
        />
      </Suspense>
    </>
  )
}

function DiscussionThreadFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}
