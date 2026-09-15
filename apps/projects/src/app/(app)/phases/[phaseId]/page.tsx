import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { PhaseDetailData } from './_components/phase-detail-data'

type Props = { params: Promise<{ phaseId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { phaseId } = await params
  return { title: phaseId }
}

export default async function PhaseDetailPage({ params }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { phaseId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/phases" label="Phases" className="mb-4" />
      <Suspense fallback={<div className="876-card h-[32rem] animate-pulse" />}>
        <PhaseDetailData
          orgId={orgId}
          phaseId={phaseId}
          currentUserId={access.subject.userId}
          canEdit={canAccess(access, 'projects.edit')}
          canCreate={canAccess(access, 'projects.create')}
        />
      </Suspense>
    </div>
  )
}
