import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CycleDetailData } from '@/features/projects/components/cycle-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = { params: Promise<{ cycleId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cycleId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.cycles.retrieve(
    organizationId,
    decodeURIComponent(cycleId)
  )
  if (!result.data) return { title: 'Cycle' }

  return { title: `${result.data.name} • Cycles` }
}

export default async function PlatformCycleDetailPage({ params }: Props) {
  const { cycleId } = await params

  return (
    <Page>
      <Suspense fallback={<CycleDetailFallback />}>
        <CycleDetailSection cycleId={cycleId} />
      </Suspense>
    </Page>
  )
}

async function CycleDetailSection({ cycleId }: { cycleId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <CycleDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      cycleId={cycleId}
    />
  )
}

function CycleDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
