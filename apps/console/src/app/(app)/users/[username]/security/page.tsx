import { platform } from '@/lib/services/platform'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import { resolveUser } from '../_data'
import { AuthMethodsSection } from './_components/auth-methods-section'
import { UsernameSection } from './_components/username-section'
import { IdentificationsSection } from './_components/identifications-section'
import { PinSection } from './_components/pin-section'

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
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <AuthMethodsData userId={user.id} />
      </Suspense>
      <UsernameSection userId={user.id} username={user.username} />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <IdentificationsData userId={user.id} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <PinData userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AuthMethodsData({ userId }: { userId: string }) {
  const accountsResult = await platform.users.listAccounts(userId)
  const accounts = accountsResult.error ? [] : accountsResult.data.data
  return <AuthMethodsSection userId={userId} accounts={accounts} />
}

async function IdentificationsData({ userId }: { userId: string }) {
  const result = await platform.identifications.list(userId)
  const identifications = result.error ? [] : result.data.data
  return <IdentificationsSection identifications={identifications} />
}

async function PinData({ userId }: { userId: string }) {
  const result = await platform.users.pin.retrieve(userId)
  if (result.error) return null
  return <PinSection userId={userId} pin={result.data} />
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
