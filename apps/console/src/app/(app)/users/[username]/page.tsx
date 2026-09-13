import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Skeleton } from '@876/ui/skeleton'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { resolveUser, resolveUserContacts } from './_data'
import { AccountStatusSection } from './_components/account-status-section'
import { ContactsAccordion } from './_components/contacts-accordion'

type Props = { params: Promise<{ username: string }> }

export const metadata = { title: 'User Details' }

export default function UserOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <UserOverviewData params={params} />
    </Suspense>
  )
}

async function UserOverviewData({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <div className="space-y-8">
      <TrackMCEventOnMount
        event={AnalyticsEvent.UserDetailViewed}
        properties={{ viewed_user_id: user.id }}
      />
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ContactsData userId={user.id} username={username} />
      </Suspense>
      {/* Account status is the last section: it holds the ban and suspend
          controls, which should never be the first thing on a record. */}
      <AccountStatusSection user={user} />
    </div>
  )
}

async function ContactsData({
  userId,
  username,
}: {
  userId: string
  username: string
}) {
  const contacts = await resolveUserContacts(userId)
  return (
    <ContactsAccordion
      userId={userId}
      username={username}
      contacts={contacts}
    />
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}
