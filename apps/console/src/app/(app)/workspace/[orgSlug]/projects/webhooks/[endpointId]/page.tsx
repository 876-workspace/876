import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { WebhookDetailData } from '@/features/projects/components/webhook-detail-data'

type Props = {
  params: Promise<{ orgSlug: string; endpointId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Webhook endpoint' }

  return {
    title: `${org.name ?? org.slug} • Webhook endpoint - Organizations`,
  }
}

export default async function OrganizationWebhookDetailPage({
  params,
}: Props) {
  const { orgSlug, endpointId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<WebhookDetailFallback />}>
      <WebhookDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        endpointId={endpointId}
      />
    </Suspense>
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
