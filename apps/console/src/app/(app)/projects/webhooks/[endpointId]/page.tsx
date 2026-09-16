import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { WebhookDetailData } from '@/features/projects/components/webhook-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ endpointId: string }>
}

export const metadata = { title: 'Webhook endpoint' }

export default async function PlatformWebhookDetailPage({ params }: Props) {
  const { endpointId } = await params

  return (
    <Page>
      <Suspense fallback={<WebhookDetailFallback />}>
        <WebhookDetailSection endpointId={endpointId} />
      </Suspense>
    </Page>
  )
}

async function WebhookDetailSection({ endpointId }: { endpointId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <WebhookDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      endpointId={endpointId}
    />
  )
}

function WebhookDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
