import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import type { AdminConsumerContact, AdminUser } from '@876/admin'

import { resolveUser, resolveUserContacts } from '../_data'
import {
  ContactsManager,
  type ContactsView,
} from './_components/contacts-manager'
import { ContactsPageSkeleton } from './_components/contacts-page-skeleton'

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

  return (
    <Suspense fallback={<ContactsPageSkeleton username={username} />}>
      <UserContactsData username={username} searchParams={searchParams} />
    </Suspense>
  )
}

async function UserContactsData({
  username,
  searchParams,
}: {
  username: string
  searchParams: Props['searchParams']
}) {
  const user = await resolveUser(username)
  if (!user) notFound()
  return <ContactsData user={user} searchParams={searchParams} />
}

async function ContactsData({
  user,
  searchParams,
}: {
  user: AdminUser
  searchParams: Props['searchParams']
}) {
  const [{ view }, contacts] = await Promise.all([
    searchParams,
    resolveUserContacts(user.id),
  ])
  return (
    <ContactsManager
      user={user}
      contacts={contacts as AdminConsumerContact[]}
      view={resolveView(view)}
    />
  )
}
