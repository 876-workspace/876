import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PortalPhaseDetailData } from '@/features/portal/components/portal-data'
import { requirePortalAccess } from '@/lib/portal-access'

export const metadata: Metadata = { title: 'Client portal phase' }

type Props = { params: Promise<{ projectId: string; phaseId: string }> }

export default async function PortalPhasePage({ params }: Props) {
  const { projectId, phaseId } = await params
  const decoded = decodeURIComponent(projectId)
  const access = await requirePortalAccess(decoded)

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <PortalPhaseDetailData
          access={access}
          projectId={decoded}
          phaseId={decodeURIComponent(phaseId)}
        />
      </Suspense>
    </div>
  )
}
