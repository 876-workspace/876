import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { resolveOrg } from './_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Organization not found' }
  return { title: `${org.name ?? org.slug} - Organizations` }
}

export default function OrganizationOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <OrganizationOverviewData params={params} />
    </Suspense>
  )
}

async function OrganizationOverviewData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <TrackMCEventOnMount
      event={AnalyticsEvent.OrgDetailViewed}
      properties={{ org_id: org.id }}
    />
  )
}
