import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveUser, resolveUserMcRole, resolveUserProfile } from '../_data'
import { ConsumerDataEditor } from '@/app/(app)/users/[username]/_components/consumer-data-editor'
import { EditUserForm } from './_components/edit-user-form'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

  return { title: `${name} • Edit - Users` }
}

export default async function UserEditPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  const [profile, mcRole] = await Promise.all([
    resolveUserProfile(user.id),
    resolveUserMcRole(user.id),
  ])

  // The card header already names the record being edited and closes back to
  // it, so the page is the forms alone.
  return (
    <div className="space-y-5">
      <EditUserForm user={user} initialRole={mcRole ?? 'user'} />
      <ConsumerDataEditor user={user} profile={profile} />
    </div>
  )
}
