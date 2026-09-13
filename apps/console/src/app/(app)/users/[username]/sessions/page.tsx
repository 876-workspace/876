import { platform } from '@/lib/services/platform'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'
import { isExpired } from '@876/platform/compat'
import { resolveUser } from '../_data'
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
  return { title: `${name} • Sessions - Users` }
}

/**
 * Where a user is signed in, and from what. Split from Security so that tab
 * keeps only credentials — how the user proves who they are.
 */
export default function UserSessionsPage({ params }: Props) {
  return (
    <Suspense fallback={<SessionsSkeleton />}>
      <SessionsPageData params={params} />
    </Suspense>
  )
}

async function SessionsPageData({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <SessionsData userId={user.id} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <DevicesData userId={user.id} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <SignInActivityData userId={user.id} />
      </Suspense>
    </div>
  )
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
  const result = await platform.users.listDevices(userId, { limit: 20 })
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
  const result = await platform.users.listSessions(userId, { limit: 20 })
  const sessions: SessionRow[] = result.error
    ? []
    : result.data.data.map((session) => ({
        id: session.id,
        deviceLabel: session.user_agent,
        location: formatLocation(session.ip_city, session.ip_country_code),
        ipAddress: session.ip_address,
        isActive: session.revoked_at === null && !isExpired(session),
        isRevoked: session.revoked_at !== null,
        createdAt: session.created_at,
        lastSeenAt: session.last_seen_at,
      }))

  return <SessionsSection userId={userId} sessions={sessions} />
}

async function SignInActivityData({ userId }: { userId: string }) {
  const result = await platform.users.listAuthAttempts(userId, { limit: 20 })
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

function SessionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
