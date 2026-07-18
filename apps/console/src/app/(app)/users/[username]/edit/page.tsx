import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveUser, resolveUserMcRole, resolveUserProfile } from '../_data'
import { ConsumerDataEditor } from '../consumer-data-editor'
import { EditUserForm } from './edit-user-form'

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
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <PageBreadcrumb
            href={`/users/${username}`}
            label="Overview"
            className="mb-4 -ml-2.5"
          />
          <h2 className="876-page-title mt-2 truncate">Edit {displayName}</h2>
        </div>
      </div>

      <EditUserForm user={user} initialRole={mcRole ?? 'user'} />
      <ConsumerDataEditor user={user} profile={profile} />
    </div>
  )
}
