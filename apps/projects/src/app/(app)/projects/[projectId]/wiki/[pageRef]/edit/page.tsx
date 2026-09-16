import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WikiEditPageData } from '@/features/collaboration/components/wiki-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../../../_components/project-tabs'

export const metadata: Metadata = { title: 'Edit wiki page' }

type Props = { params: Promise<{ projectId: string; pageRef: string }> }

export default async function WikiEditPage({ params }: Props) {
  await requireAppAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId, pageRef } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(pageRef)}`}
        label="Wiki page"
        className="mb-4"
      />
      <ProjectTabs projectId={projectId} />
      <h1 className="876-page-title mb-4">Edit wiki page</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <WikiEditPageData orgId={orgId} projectId={projectId} pageRef={pageRef} />
      </Suspense>
    </div>
  )
}
