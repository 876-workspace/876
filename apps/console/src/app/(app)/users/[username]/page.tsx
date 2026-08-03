import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { resolveUser } from './_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Users` }
}

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
