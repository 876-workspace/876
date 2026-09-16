import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectDiscussionsData } from '@/features/collaboration/components/discussion-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Discussions' }

type Props = { params: Promise<{ projectId: string }> }

export default async function ProjectDiscussionsPage({ params }: Props) {
  await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <h1 className="876-page-title mb-4">Discussions</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <ProjectDiscussionsData orgId={orgId} projectId={projectId} />
      </Suspense>
    </div>
  )
}
