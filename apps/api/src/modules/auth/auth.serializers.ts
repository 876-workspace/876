import { fromDbUnixSeconds } from '@/platform/timestamps'
import type { AuthEvent } from '@/providers/auth'

export function serializeAuthEvent(event: AuthEvent) {
  return {
    object: 'auth_event' as const,
    type: event.kind,
    email: event.email,
    pendingAuthenticationToken: event.pendingToken,
  }
}

export type UserRow = {
  id: string
  stripeCustomerId: string | null
  email: string
  username: string | null
  emailVerified: boolean
  firstName: string
  lastName: string
  middleName: string | null
  avatar: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}

export function serializeUser(row: UserRow) {
  return {
    object: 'user' as const,
    id: row.id,
    stripeCustomerId: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    emailVerified: row.emailVerified,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    avatar: row.avatar,
    status: row.status,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeSession(row: UserRow) {
  return {
    object: 'session' as const,
    user: serializeUser(row),
    sessionMeta: {
      object: 'session' as const,
      userId: row.id,
      expiresAt: null as number | null,
    },
  }
}

export function serializeRefreshUser(providerUser: {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  avatar: string | null
}) {
  return {
    id: providerUser.id,
    email: providerUser.email,
    firstName: providerUser.firstName,
    lastName: providerUser.lastName,
    emailVerified: providerUser.emailVerified,
    avatar: providerUser.avatar,
  }
}

export type MyDeviceRow = {
  id: string
  fingerprint: string
  label: string | null
  deviceType: string
  deviceBrand: string | null
  deviceModel: string | null
  osName: string | null
  browserName: string | null
  lastCountryCode: string | null
  trusted: boolean
  signInCount: number
  firstSeenAt: bigint
  lastSeenAt: bigint
}

export function serializeMyDevice(
  row: MyDeviceRow,
  currentFingerprint: string | null
) {
  const name =
    row.label ||
    [row.deviceBrand, row.deviceModel].filter(Boolean).join(' ') ||
    row.deviceType
  return {
    object: 'my_device' as const,
    id: row.id,
    name,
    device_type: row.deviceType,
    os_name: row.osName,
    browser_name: row.browserName,
    last_country_code: row.lastCountryCode,
    trusted: row.trusted,
    sign_in_count: row.signInCount,
    first_seen_at: fromDbUnixSeconds(row.firstSeenAt),
    last_seen_at: fromDbUnixSeconds(row.lastSeenAt),
    is_current:
      currentFingerprint !== null && row.fingerprint === currentFingerprint,
  }
}

export type MySessionRow = {
  id: string
  deviceId: string | null
  ipCity: string | null
  ipCountryCode: string | null
  createdAt: bigint
  lastSeenAt: bigint | null
  expiresAt: bigint
}

export function serializeMySession(
  row: MySessionRow,
  currentSid: string | null
) {
  return {
    object: 'my_session' as const,
    id: row.id,
    device_id: row.deviceId,
    city: row.ipCity,
    country_code: row.ipCountryCode,
    created_at: fromDbUnixSeconds(row.createdAt),
    last_seen_at: row.lastSeenAt ? fromDbUnixSeconds(row.lastSeenAt) : null,
    expires_at: fromDbUnixSeconds(row.expiresAt),
    is_current: currentSid !== null && row.id === currentSid,
  }
}

export type RoutingMembershipRow = {
  id: string
  role: string
  status: string
  permissions: string[]
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
    logoUrl: string | null
  }
}

export function serializeRoutingMemberships(rows: RoutingMembershipRow[]) {
  return {
    data: rows.map((r) => ({
      id: r.id,
      role: r.role,
      status: r.status,
      permissions: r.permissions,
      organization: {
        id: r.organization.id,
        name: r.organization.name,
        slug: r.organization.slug,
        status: r.organization.status,
        logo_url: r.organization.logoUrl,
      },
    })),
  }
}
