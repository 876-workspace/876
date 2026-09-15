import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { CycleDetailData } from './_components/cycle-detail-data'

type Props = { params: Promise<{ cycleId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cycleId } = await params
  return { title: cycleId }
}

export default async function CycleDetailPage({ params }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId } = await requireProjectsContext()
  const { cycleId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/cycles" label="Cycles" className="mb-4" />
      <Suspense fallback={<div className="876-card h-[32rem] animate-pulse" />}>
        <CycleDetailData
          orgId={orgId}
          cycleId={cycleId}
          canEdit={canAccess(access, 'projects.edit')}
        />
      </Suspense>
    </div>
  )
}
