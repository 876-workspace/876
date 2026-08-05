import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import { resolveUser } from '../_data'
import { $876 } from '@/lib/876'
import { AccountStatusSection } from './_components/account-status-section'
import { AuthMethodsSection } from './_components/auth-methods-section'
import { UsernameSection } from './_components/username-section'
import {
  SessionsSection,
  type SessionRow,
} from './_components/sessions-section'
import { DevicesSection, type DeviceRow } from './_components/devices-section'
import {
  SignInActivitySection,
  type AttemptRow,
} from './_components/sign-in-activity-section'

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
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <DevicesData userId={user.id} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <SessionsData userId={user.id} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <SignInActivityData userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AuthMethodsData({ userId }: { userId: string }) {
  const accountsResult = await $876.users.listAccounts(userId)
  const accounts = accountsResult.error ? [] : accountsResult.data.data
  return <AuthMethodsSection userId={userId} accounts={accounts} />
}

/** `Kingston, JM` — omits whichever half the edge did not resolve. */
function formatLocation(city: string | null, countryCode: string | null) {
  return [city, countryCode].filter(Boolean).join(', ') || null
}

function describeDevice(device: {
  device_brand: string | null
  device_model: string | null
  device_type: string
  os_name: string | null
  browser_name: string | null
  label: string | null
}) {
  const name =
    device.label ??
    [device.device_brand, device.device_model].filter(Boolean).join(' ') ??
    null
  return name || device.device_type
}

async function DevicesData({ userId }: { userId: string }) {
  const result = await $876.users.listDevices(userId, { limit: 20 })
  const devices: DeviceRow[] = result.error
    ? []
    : result.data.data.map((device) => ({
        id: device.id,
        name: describeDevice(device),
        detail:
          [device.os_name, device.browser_name].filter(Boolean).join(' · ') ||
          null,
        lastLocation: formatLocation(null, device.last_country_code),
        signInCount: device.sign_in_count,
        lastSeenAt: device.last_seen_at,
        trusted: device.trusted,
        blocked: device.blocked_at !== null,
      }))

  return <DevicesSection devices={devices} />
}

async function SessionsData({ userId }: { userId: string }) {
  const result = await $876.users.listSessions(userId, { limit: 20 })
  const now = Math.floor(Date.now() / 1000)
  const sessions: SessionRow[] = result.error
    ? []
    : result.data.data.map((session) => ({
        id: session.id,
        deviceLabel: session.user_agent,
        location: formatLocation(session.ip_city, session.ip_country_code),
        ipAddress: session.ip_address,
        isActive: session.revoked_at === null && session.expires_at > now,
        isRevoked: session.revoked_at !== null,
        createdAt: session.created_at,
        lastSeenAt: session.last_seen_at,
      }))

  return <SessionsSection userId={userId} sessions={sessions} />
}

async function SignInActivityData({ userId }: { userId: string }) {
  const result = await $876.users.listAuthAttempts(userId, { limit: 20 })
  const attempts: AttemptRow[] = result.error
    ? []
    : result.data.data.map((attempt) => ({
        id: attempt.id,
        event: attempt.event,
        outcome: attempt.outcome,
        failureCode: attempt.failure_code,
        location: formatLocation(attempt.ip_city, attempt.ip_country_code),
        device:
          [attempt.os_name, attempt.browser_name].filter(Boolean).join(' · ') ||
          null,
        ipAddress: attempt.ip_address,
        createdAt: attempt.created_at,
      }))

  return <SignInActivitySection attempts={attempts} />
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
