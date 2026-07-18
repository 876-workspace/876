import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { AdminAddress, AdminUser } from '@876/admin'

import { resolveUser, resolveUserAddresses } from '../_data'
import { AddressesManager, type AddressesView } from './addresses-manager'

type Props = {
  params: Promise<{ username: string }>
  searchParams: Promise<{ view?: string }>
}

const VALID_VIEWS: AddressesView[] = ['table', 'grid', 'list']

function resolveView(value: string | undefined): AddressesView {
  return VALID_VIEWS.includes(value as AddressesView)
    ? (value as AddressesView)
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

  return { title: `${userDisplayName(user)} • Addresses - Users` }
}

export default async function UserAddressesPage({
  params,
  searchParams,
}: Props) {
  const { username } = await params
  const { view } = await searchParams
  const user = await resolveUser(username)
  if (!user) notFound()

  const addresses = await resolveUserAddresses(user.id)

  return (
    <AddressesManager
      user={user}
      addresses={addresses as AdminAddress[]}
      view={resolveView(view)}
    />
  )
}
