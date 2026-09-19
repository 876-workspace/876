import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PhaseDetailData } from '@/features/projects/components/phase-detail-data'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = { params: Promise<{ phaseId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { phaseId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.milestones.retrieve(organizationId, phaseId)
  if (!result.data) return { title: 'Phase' }

  return { title: `${result.data.name} • Phases` }
}

export default async function PlatformPhaseDetailPage({ params }: Props) {
  const { phaseId } = await params

  return (
    <Page>
      <Suspense fallback={<PhaseDetailFallback />}>
        <PhaseDetailSection phaseId={phaseId} />
      </Suspense>
    </Page>
  )
}

async function PhaseDetailSection({ phaseId }: { phaseId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return <PhaseDetailData organizationId={organizationId} phaseId={phaseId} />
}

function PhaseDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  )
}
