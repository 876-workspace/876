import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Device, DeviceUser } from './devices.schemas'

export type DeviceRow = {
  id: string
  userId: string
  fingerprint: string
  confidence: string
  deviceType: string
  deviceBrand: string | null
  deviceModel: string | null
  osName: string | null
  osVersion: string | null
  browserName: string | null
  browserVersion: string | null
  isBot: boolean
  label: string | null
  trusted: boolean
  trustedAt: bigint | null
  trustedBy: string | null
  blockedAt: bigint | null
  blockedBy: string | null
  blockReason: string | null
  firstSeenAt: bigint
  lastSeenAt: bigint
  lastIp: string | null
  lastCountryCode: string | null
  signInCount: number
  createdAt: bigint
  updatedAt: bigint
}

const seconds = (value: bigint | null): number | null =>
  value === null ? null : fromDbUnixSeconds(value)

export function serializeDevice(row: DeviceRow): Device {
  return {
    object: 'device',
    id: row.id,
    user_id: row.userId,
    fingerprint: row.fingerprint,
    confidence: row.confidence,
    device_type: row.deviceType,
    device_brand: row.deviceBrand,
    device_model: row.deviceModel,
    os_name: row.osName,
    os_version: row.osVersion,
    browser_name: row.browserName,
    browser_version: row.browserVersion,
    is_bot: row.isBot,
    label: row.label,
    trusted: row.trusted,
    trusted_at: seconds(row.trustedAt),
    trusted_by: row.trustedBy,
    blocked_at: seconds(row.blockedAt),
    blocked_by: row.blockedBy,
    block_reason: row.blockReason,
    first_seen_at: fromDbUnixSeconds(row.firstSeenAt),
    last_seen_at: fromDbUnixSeconds(row.lastSeenAt),
    last_ip: row.lastIp,
    last_country_code: row.lastCountryCode,
    sign_in_count: row.signInCount,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeDeviceUser(row: DeviceRow): DeviceUser {
  return {
    object: 'device_user',
    user_id: row.userId,
    device_id: row.id,
    first_seen_at: fromDbUnixSeconds(row.firstSeenAt),
    last_seen_at: fromDbUnixSeconds(row.lastSeenAt),
    sign_in_count: row.signInCount,
  }
}
