import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { resolveUser } from './_data'

type Props = { params: Promise<{ username: string }> }

export const metadata = { title: 'User Details' }

export default function UserOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <UserOverviewData params={params} />
    </Suspense>
  )
}

async function UserOverviewData({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <TrackMCEventOnMount
      event={AnalyticsEvent.UserDetailViewed}
      properties={{ viewed_user_id: user.id }}
    />
  )
}
