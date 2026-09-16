import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PortalOverviewData } from '@/features/portal/components/portal-data'
import { requirePortalAccess } from '@/lib/portal-access'

export const metadata: Metadata = { title: 'Client portal overview' }

type Props = { params: Promise<{ projectId: string }> }

export default async function PortalOverviewPage({ params }: Props) {
  const { projectId } = await params
  const decoded = decodeURIComponent(projectId)
  const access = await requirePortalAccess(decoded)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <PortalOverviewData access={access} projectId={decoded} />
      </Suspense>
    </div>
  )
}
