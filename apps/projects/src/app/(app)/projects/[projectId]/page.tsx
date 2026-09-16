import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectDetailData } from './_components/project-detail-data'
import { ProjectDetailSkeleton } from './_components/project-detail-skeleton'
import { ProjectTabs } from './_components/project-tabs'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  return { title: projectId }
}

export default async function ProjectDetailPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { projectId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailData orgId={orgId} projectId={projectId} />
      </Suspense>
    </div>
  )
}
