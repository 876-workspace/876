import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import { resolveUser } from '../_data'
import { $876 } from '@/lib/876'
import { AccountStatusSection } from './_components/account-status-section'
import { AuthMethodsSection } from './_components/auth-methods-section'
import { UsernameSection } from './_components/username-section'
import { SessionsSection } from './_components/sessions-section'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Security` }
}

export default function SecurityPage({ params }: Props) {
  return (
    <Suspense fallback={<SecuritySkeleton />}>
      <SecurityData params={params} />
    </Suspense>
  )
}

async function SecurityData({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <AccountStatusSection user={user} />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <AuthMethodsData userId={user.id} />
      </Suspense>
      <UsernameSection userId={user.id} username={user.username} />
      <SessionsSection userId={user.id} />
    </div>
  )
}

async function AuthMethodsData({ userId }: { userId: string }) {
  const accountsResult = await $876.users.listAccounts(userId)
  const accounts = accountsResult.error ? [] : accountsResult.data.data
  return <AuthMethodsSection userId={userId} accounts={accounts} />
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
