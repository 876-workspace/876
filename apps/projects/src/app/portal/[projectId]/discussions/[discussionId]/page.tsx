import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PortalDiscussionDetailData } from '@/features/portal/components/portal-data'
import { requirePortalAccess } from '@/lib/portal-access'

export const metadata: Metadata = { title: 'Client portal discussion' }

type Props = { params: Promise<{ projectId: string; discussionId: string }> }

export default async function PortalDiscussionPage({ params }: Props) {
  const { projectId, discussionId } = await params
  const decoded = decodeURIComponent(projectId)
  const access = await requirePortalAccess(decoded)

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}>
        <PortalDiscussionDetailData
          access={access}
          projectId={decoded}
          discussionId={decodeURIComponent(discussionId)}
        />
      </Suspense>
    </div>
  )
}
