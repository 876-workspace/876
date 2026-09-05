import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectDetailData } from './_components/project-detail-data'
import { ProjectDetailSkeleton } from './_components/project-detail-skeleton'
import { requireAppPermission } from '@/lib/auth/require-projects-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  return { title: projectId }
}

export default async function ProjectDetailPage({ params }: Props) {
  await requireAppPermission('projects.view')
  const { orgId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailDataFromParams orgId={orgId} params={params} />
      </Suspense>
    </div>
  )
}

async function ProjectDetailDataFromParams({
  orgId,
  params,
}: {
  orgId: string
  params: Props['params']
}) {
  const { projectId } = await params
  return <ProjectDetailData orgId={orgId} projectId={projectId} />
}
