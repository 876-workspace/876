import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectWikiData } from '@/features/collaboration/components/wiki-data'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Wiki' }

type Props = { params: Promise<{ projectId: string }> }

export default async function ProjectWikiPage({ params }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <h1 className="876-page-title mb-4">Wiki</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <ProjectWikiData
          orgId={orgId}
          projectId={projectId}
          canEdit={canAccess(access, 'projects.edit')}
        />
      </Suspense>
    </div>
  )
}
