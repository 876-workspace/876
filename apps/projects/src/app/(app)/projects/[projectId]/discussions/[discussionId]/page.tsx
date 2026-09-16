import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { DiscussionThreadData } from '@/features/collaboration/components/discussion-data'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../../_components/project-tabs'

export const metadata: Metadata = { title: 'Discussion' }

type Props = { params: Promise<{ projectId: string; discussionId: string }> }

export default async function DiscussionThreadPage({ params }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId, discussionId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/discussions`}
        label="Discussions"
        className="mb-4"
      />
      <ProjectTabs projectId={projectId} />
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <DiscussionThreadData
          orgId={orgId}
          projectId={projectId}
          discussionId={discussionId}
          canEdit={canAccess(access, 'projects.edit')}
        />
      </Suspense>
    </div>
  )
}
