import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

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

export default function UserContactsPage({ params, searchParams }: Props) {
  return (
    // The outer fallback is the whole route shell, matching loading.tsx — a
    // body-only fallback here would drop the toolbar placeholder loading.tsx
    // had already painted and shift the panel upward.
    <Suspense fallback={<ContactsPageSkeleton />}>
      <UserContactsData params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function UserContactsData({ params, searchParams }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ContactsData user={user} searchParams={searchParams} />
    </Suspense>
  )
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
