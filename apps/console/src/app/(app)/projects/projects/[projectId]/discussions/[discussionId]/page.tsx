import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DiscussionThreadData } from '@/features/projects/components/discussions-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../../../_lib/base'

type Props = {
  params: Promise<{ projectId: string; discussionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, discussionId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.discussions.retrieve(
    organizationId,
    projectId,
    decodeURIComponent(discussionId),
  )
  if (!result.data) return { title: 'Discussion' }

  return { title: `${result.data.title} • Discussions - Projects` }
}

export default async function PlatformDiscussionThreadPage({
  params,
}: Props) {
  const { projectId, discussionId } = await params
  const base = projectsBase(null)

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <Suspense fallback={<DiscussionThreadFallback />}>
        <DiscussionThreadSection
          projectId={projectId}
          discussionId={discussionId}
        />
      </Suspense>
    </Page>
  )
}

async function DiscussionThreadSection({
  projectId,
  discussionId,
}: {
  projectId: string
  discussionId: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <DiscussionThreadData
      organizationId={organizationId}
      projectId={projectId}
      discussionId={discussionId}
    />
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
