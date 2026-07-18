import { notFound } from 'next/navigation'
import { resolveUser } from '../_data'
import { $876 } from '@/lib/876'
import { AccountStatusSection } from './account-status-section'
import { AuthMethodsSection } from './auth-methods-section'
import { UsernameSection } from './username-section'
import { SessionsSection } from './sessions-section'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Security` }
}

export default async function SecurityPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  // Fetch linked accounts server-side
  const accountsResult = await $876.users.listAccounts(user.id)
  const accounts = accountsResult.error ? [] : accountsResult.data.data

  return (
    <div className="space-y-6">
      <AccountStatusSection user={user} />
      <AuthMethodsSection userId={user.id} accounts={accounts} />
      <UsernameSection userId={user.id} username={user.username} />
      <SessionsSection userId={user.id} />
    </div>
  )
}
