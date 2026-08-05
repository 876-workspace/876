import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Building2, Link2 } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { Panel } from '../_components/account/panel'
import { RelationshipList } from '../_components/account/relationships'
import { MembershipList } from '../_components/account/identity'
import {
  resolveUser,
  resolveUserMemberships,
  resolveUserRelationships,
} from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Relationships' }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Relationships - Users` }
}

/**
 * Everything this person is to an organization, in one place.
 *
 * Two layers, kept visibly apart because they mean different things: a
 * **membership** is "they work there", a **relationship** is "they are a
 * customer of it". A courier employee who also ships parcels through their own
 * employer holds both, and flattening them into one list makes it impossible to
 * tell which hat any given row is about.
 */
export default async function UserRelationshipsPage({ params }: Props) {
  const { username } = await params

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <RelationshipsData username={username} />
    </Suspense>
  )
}

async function RelationshipsData({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) notFound()

  const [relationships, memberships] = await Promise.all([
    resolveUserRelationships(user.id),
    resolveUserMemberships(user.id),
  ])

  return (
    <div className="space-y-4">
      <Panel
        title="Customer of"
        icon={Link2}
        tone="violet"
        count={relationships.length}
      >
        <RelationshipList relationships={relationships} />
      </Panel>

      <Panel
        title="Member of"
        icon={Building2}
        tone="amber"
        count={memberships.length}
      >
        <MembershipList memberships={memberships} />
      </Panel>
    </div>
  )
}
