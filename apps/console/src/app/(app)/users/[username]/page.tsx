import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import type { UserViewData } from './_lib/view-data'
import { enforcementTags } from './_lib/enforcement'
import { resolveUserViewVariant } from './_lib/variant'
import {
  resolveAccountShape,
  resolveUser,
  resolveUserAccounts,
  resolveUserAddresses,
  resolveUserApps,
  resolveUserContacts,
  resolveUserMemberships,
  resolveUserRelationships,
  resolveUserRequests,
} from './_data'
import { CommandVariant } from './_components/variants/command'
import { DeskVariant } from './_components/variants/desk'
import { RelationshipVariant } from './_components/variants/relationship'

type Props = {
  params: Promise<{ username: string }>
  searchParams: Promise<{ variant?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Users` }
}

/**
 * The user overview. `params` and `searchParams` carry no I/O, so they are
 * awaited here and the Suspense boundary sits only around the component that
 * actually fetches — the loading rule in `CLAUDE.md`.
 */
export default async function UserOverviewPage({
  params,
  searchParams,
}: Props) {
  const [{ username }, { variant }] = await Promise.all([params, searchParams])

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <UserOverviewData
        username={username}
        variant={resolveUserViewVariant(variant)}
      />
    </Suspense>
  )
}

async function UserOverviewData({
  username,
  variant,
}: {
  username: string
  variant: ReturnType<typeof resolveUserViewVariant>
}) {
  const user = await resolveUser(username)
  if (!user) notFound()

  // One resolve for every variant. They differ in composition, never in what
  // they can see, so a layout change can never become a data change.
  const [
    shape,
    accounts,
    memberships,
    apps,
    relationships,
    requests,
    addresses,
    contacts,
  ] = await Promise.all([
    resolveAccountShape(user.id),
    resolveUserAccounts(user.id),
    resolveUserMemberships(user.id),
    resolveUserApps(user.id),
    resolveUserRelationships(user.id),
    resolveUserRequests(user.id),
    resolveUserAddresses(user.id),
    resolveUserContacts(user.id),
  ])

  const data: UserViewData = {
    user,
    shape,
    tags: enforcementTags(user),
    accounts,
    memberships,
    apps,
    relationships,
    requests,
    addressCount: addresses.length,
    contactCount: contacts.length,
  }

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.UserDetailViewed}
        properties={{ viewed_user_id: user.id, variant }}
      />
      {variant === 'desk' && <DeskVariant data={data} />}
      {variant === 'relationship' && <RelationshipVariant data={data} />}
      {variant === 'command' && <CommandVariant data={data} />}
    </>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[4.5rem] w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}
