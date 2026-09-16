import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WikiNewPageData } from '@/features/collaboration/components/wiki-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../../_components/project-tabs'

export const metadata: Metadata = { title: 'New wiki page' }

type Props = { params: Promise<{ projectId: string }> }

export default async function WikiNewPage({ params }: Props) {
  await requireAppAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/wiki`}
        label="Wiki"
        className="mb-4"
      />
      <ProjectTabs projectId={projectId} />
      <h1 className="876-page-title mb-4">New wiki page</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <WikiNewPageData orgId={orgId} projectId={projectId} />
      </Suspense>
    </div>
  )
}
