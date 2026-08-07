import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { AuthAttempt } from './auth-attempts.schemas'

export type AuthAttemptRow = {
  id: string
  event: string
  outcome: string
  failureCode: string | null
  identifier: string | null
  userId: string | null
  appId: string | null
  sessionId: string | null
  realm: string | null
  deviceId: string | null
  deviceFingerprint: string | null
  ipAddress: string | null
  ipCountryCode: string | null
  ipRegionCode: string | null
  ipRegion: string | null
  ipCity: string | null
  ipPostalCode: string | null
  ipTimezone: string | null
  ipLatitude: string | null
  ipLongitude: string | null
  ipAsn: string | null
  ipAsOrganization: string | null
  userAgent: string | null
  deviceType: string | null
  deviceBrand: string | null
  deviceModel: string | null
  osName: string | null
  osVersion: string | null
  browserName: string | null
  browserVersion: string | null
  isBot: boolean
  contextTrusted: boolean
  riskScore: number | null
  riskReasons: unknown
  requestId: string | null
  createdAt: bigint
}

/**
 * `risk_reasons` is a `Json` column, so a row written by an older shape can hold
 * anything. Only an array of strings is a meaningful answer; anything else
 * serializes as null rather than handing a client a value it cannot render.
 */
function riskReasons(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null

  const reasons = value.filter(
    (item): item is string => typeof item === 'string'
  )
  return reasons.length === value.length ? reasons : null
}

export function serializeAuthAttempt(row: AuthAttemptRow): AuthAttempt {
  return {
    object: 'auth_attempt',
    id: row.id,
    event: row.event,
    outcome: row.outcome,
    failure_code: row.failureCode,
    identifier: row.identifier,
    user_id: row.userId,
    app_id: row.appId,
    session_id: row.sessionId,
    realm: row.realm,
    device_id: row.deviceId,
    device_fingerprint: row.deviceFingerprint,
    ip_address: row.ipAddress,
    ip_country_code: row.ipCountryCode,
    ip_region_code: row.ipRegionCode,
    ip_region: row.ipRegion,
    ip_city: row.ipCity,
    ip_postal_code: row.ipPostalCode,
    ip_timezone: row.ipTimezone,
    ip_latitude: row.ipLatitude,
    ip_longitude: row.ipLongitude,
    ip_asn: row.ipAsn,
    ip_as_organization: row.ipAsOrganization,
    user_agent: row.userAgent,
    device_type: row.deviceType,
    device_brand: row.deviceBrand,
    device_model: row.deviceModel,
    os_name: row.osName,
    os_version: row.osVersion,
    browser_name: row.browserName,
    browser_version: row.browserVersion,
    is_bot: row.isBot,
    context_trusted: row.contextTrusted,
    risk_score: row.riskScore,
    risk_reasons: riskReasons(row.riskReasons),
    request_id: row.requestId,
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}
