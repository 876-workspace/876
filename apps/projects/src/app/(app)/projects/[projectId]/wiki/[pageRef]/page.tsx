import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WikiPageData } from '@/features/collaboration/components/wiki-data'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../../_components/project-tabs'

type Props = { params: Promise<{ projectId: string; pageRef: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageRef } = await params
  return { title: decodeURIComponent(pageRef) }
}

export default async function WikiPageRoute({ params }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId, pageRef } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/projects/${encodeURIComponent(projectId)}/wiki`}
        label="Wiki"
        className="mb-4"
      />
      <ProjectTabs projectId={projectId} />
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <WikiPageData
          orgId={orgId}
          projectId={projectId}
          pageRef={pageRef}
          canEdit={canAccess(access, 'projects.edit')}
        />
      </Suspense>
    </div>
  )
}
