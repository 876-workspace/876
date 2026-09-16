import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { GlobalActivityData } from '@/features/collaboration/components/activity-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata: Metadata = { title: 'Activity' }

export default async function GlobalActivityPage() {
  await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const projectsResult = await projects.projects.list(orgId, { limit: 20 })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/" label="Home" className="mb-4" />
      <h1 className="876-page-title mb-4">Activity</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <GlobalActivityData
          orgId={orgId}
          projects={(projectsResult.data?.data ?? []).map((project) => ({
            id: project.id,
            key: project.key,
          }))}
        />
      </Suspense>
    </div>
  )
}
