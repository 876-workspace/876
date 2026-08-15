import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Session } from './sessions.schemas'

export type SessionRow = {
  id: string
  userId: string
  appId: string | null
  expiresAt: bigint
  ipAddress: string | null
  userAgent: string | null
  deviceId: string | null
  ipCountryCode: string | null
  ipRegion: string | null
  ipCity: string | null
  ipAsn: string | null
  ipAsOrganization: string | null
  lastSeenAt: bigint | null
  revokedAt: bigint | null
  revokedBy: string | null
  createdAt: bigint
  updatedAt: bigint
}

const seconds = (value: bigint | null): number | null =>
  value === null ? null : fromDbUnixSeconds(value)

/**
 * A session resource never carries `token` or `token_hash`. The row holds the
 * live credential; the API describes the session.
 */
export function serializeSession(row: SessionRow): Session {
  return {
    object: 'session',
    id: row.id,
    userId: row.userId,
    appId: row.appId,
    expiresAt: fromDbUnixSeconds(row.expiresAt),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceId: row.deviceId,
    ip_country_code: row.ipCountryCode,
    ip_region: row.ipRegion,
    ip_city: row.ipCity,
    ip_asn: row.ipAsn,
    ip_as_organization: row.ipAsOrganization,
    lastSeenAt: seconds(row.lastSeenAt),
    revoked_at: seconds(row.revokedAt),
    revoked_by: row.revokedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
