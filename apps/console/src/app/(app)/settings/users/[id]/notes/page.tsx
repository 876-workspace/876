import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NotesView } from '@/components/detail/detail-views'
import { resolveMemberGrant, resolveMemberIdentity } from '../_data'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) return { title: 'Notes' }
  const name =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id
  return { title: `${name} • Notes - Team` }
}

export default async function TeamMemberNotesPage({ params }: Props) {
  const { id } = await params
  const grant = await resolveMemberGrant(id)
  if (!grant) notFound()

  return <NotesView subjectType="user" subjectId={id} />
}
