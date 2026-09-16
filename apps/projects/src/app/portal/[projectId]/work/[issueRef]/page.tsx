import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PortalWorkDetailData } from '@/features/portal/components/portal-data'
import { requirePortalAccess } from '@/lib/portal-access'

export const metadata: Metadata = { title: 'Client portal work item' }

type Props = { params: Promise<{ projectId: string; issueRef: string }> }

export default async function PortalWorkItemPage({ params }: Props) {
  const { projectId, issueRef } = await params
  const decoded = decodeURIComponent(projectId)
  const access = await requirePortalAccess(decoded)

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <PortalWorkDetailData
          access={access}
          projectId={decoded}
          issueRef={decodeURIComponent(issueRef)}
        />
      </Suspense>
    </div>
  )
}
