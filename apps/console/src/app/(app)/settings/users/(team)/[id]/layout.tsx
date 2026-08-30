import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { Skeleton } from '@876/ui/skeleton'

import { resolveMemberGrant, resolveMemberIdentity } from './_data'
import { TeamMemberCardFrame } from './_components/team-member-card-frame'

type Props = { children: ReactNode; params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) return { title: 'Member not found' }
  const name =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id
  return { title: `${name} - Team` }
}

/**
 * The member card chrome streams beside the persistent Team list. Each tab is
 * a real route, so it is reload-safe and shareable.
 */
export default async function TeamMemberLayout({ children, params }: Props) {
  const { id } = await params

  return (
    <Suspense key={id} fallback={<MemberCardFallback />}>
      <MemberCard id={id}>{children}</MemberCard>
    </Suspense>
  )
}

async function MemberCard({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) notFound()

  const displayName =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id

  return (
    <TeamMemberCardFrame
      member={{
        id,
        name: displayName,
        email: identity?.email ?? null,
        avatar: identity?.avatar ?? null,
        role: grant.roleName,
        status: grant.status,
      }}
    >
      {children}
    </TeamMemberCardFrame>
  )
}

function MemberCardFallback() {
  return (
    <div className="876-card h-full p-6">
      <Skeleton className="h-16 w-64" />
    </div>
  )
}
