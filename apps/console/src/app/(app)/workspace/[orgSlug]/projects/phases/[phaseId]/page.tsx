import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PhaseDetailData } from '@/features/projects/components/phase-detail-data'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  params: Promise<{ orgSlug: string; phaseId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, phaseId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Phase' }

  const result = await projects.milestones.retrieve(org.id, phaseId)
  if (!result.data) return { title: 'Phase' }

  return { title: `${result.data.name} • Phases - Organizations` }
}

export default async function OrganizationPhaseDetailPage({ params }: Props) {
  const { orgSlug, phaseId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<PhaseDetailFallback />}>
      <PhaseDetailData organizationId={org.id} phaseId={phaseId} />
    </Suspense>
  )
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
