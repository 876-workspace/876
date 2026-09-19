import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CycleDetailData } from '@/features/projects/components/cycle-detail-data'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; cycleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, cycleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Cycle' }

  const result = await projects.cycles.retrieve(
    org.id,
    decodeURIComponent(cycleId)
  )
  if (!result.data) return { title: 'Cycle' }

  return { title: `${result.data.name} • Cycles - Organizations` }
}

export default async function OrganizationCycleDetailPage({ params }: Props) {
  const { orgSlug, cycleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<CycleDetailFallback />}>
      <CycleDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        cycleId={cycleId}
      />
    </Suspense>
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
