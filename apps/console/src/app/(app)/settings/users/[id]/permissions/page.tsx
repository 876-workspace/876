import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveMemberGrant, resolveMemberIdentity } from '../_data'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) return { title: 'Permissions' }
  const name =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id
  return { title: `${name} • Permissions - Team` }
}

export default async function TeamMemberPermissionsPage({ params }: Props) {
  const { id } = await params
  const grant = await resolveMemberGrant(id)
  if (!grant) notFound()

  return <div />
}
