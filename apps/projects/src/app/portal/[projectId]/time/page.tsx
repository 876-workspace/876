import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PortalTimeData } from '@/features/portal/components/portal-data'
import { requirePortalAccess } from '@/lib/portal-access'

export const metadata: Metadata = { title: 'Client portal time' }

type Props = { params: Promise<{ projectId: string }> }

export default async function PortalTimePage({ params }: Props) {
  const { projectId } = await params
  const decoded = decodeURIComponent(projectId)
  const access = await requirePortalAccess(decoded)

  return (
    <div className="space-y-4">
      <h1 className="876-page-title">Time</h1>
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <PortalTimeData access={access} projectId={decoded} />
      </Suspense>
    </div>
  )
}
