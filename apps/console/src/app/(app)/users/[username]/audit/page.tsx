import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { AuditView } from '@/components/patterns/detail/detail-views'
import { resolveUser } from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Audit' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Audit - Users` }
}

export default function UserAuditPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <UserAuditData params={params} />
    </Suspense>
  )
}

async function UserAuditData({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <AuditView subjectType="user" subjectId={user.id} />
    </Suspense>
  )
}
