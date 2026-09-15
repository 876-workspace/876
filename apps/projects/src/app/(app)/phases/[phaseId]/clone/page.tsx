import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ClonePhaseData } from '@/features/projects/components/clone-phase-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

type Props = { params: Promise<{ phaseId: string }> }

export const metadata: Metadata = { title: 'Clone phase' }

export default async function ClonePhasePage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.create' })
  const { orgId } = await requireProjectsContext()
  const { phaseId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/phases/${encodeURIComponent(phaseId)}`}
        label="Phase"
        className="mb-4"
      />
      <ResourceToolbar title="Clone phase" />
      <Suspense
        fallback={<div className="876-card h-72 max-w-2xl animate-pulse" />}
      >
        <ClonePhaseData orgId={orgId} phaseId={phaseId} />
      </Suspense>
    </div>
  )
}
