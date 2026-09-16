import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectActivityData } from '@/features/collaboration/components/activity-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Activity' }

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ cursor?: string }>
}

export default async function ProjectActivityPage({
  params,
  searchParams,
}: Props) {
  await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params
  const { cursor } = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <h1 className="876-page-title mb-4">Activity</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <ProjectActivityData
          orgId={orgId}
          projectId={projectId}
          cursor={cursor}
        />
      </Suspense>
    </div>
  )
}
