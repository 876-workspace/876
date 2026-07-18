import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { AdminConsumerContact, AdminUser } from '@876/admin'

import { resolveUser, resolveUserContacts } from '../_data'
import { ContactsManager, type ContactsView } from './contacts-manager'

type Props = {
  params: Promise<{ username: string }>
  searchParams: Promise<{ view?: string }>
}

const VALID_VIEWS: ContactsView[] = ['table', 'grid', 'list']

function resolveView(value: string | undefined): ContactsView {
  return VALID_VIEWS.includes(value as ContactsView)
    ? (value as ContactsView)
    : 'grid'
}

function userDisplayName(user: AdminUser) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }

  return { title: `${userDisplayName(user)} • Contacts - Users` }
}

export default async function UserContactsPage({
  params,
  searchParams,
}: Props) {
  const { username } = await params
  const { view } = await searchParams
  const user = await resolveUser(username)
  if (!user) notFound()

  const contacts = await resolveUserContacts(user.id)

  return (
    <ContactsManager
      user={user}
      contacts={contacts as AdminConsumerContact[]}
      view={resolveView(view)}
    />
  )
}
