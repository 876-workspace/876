import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'
import { nowUnixSeconds } from '@/platform/timestamps'

import type { ListDevicesQuery } from './devices.schemas'
import type { DeviceRow } from './devices.serializers'

/** Every query against `user_devices`. */

const SELECT = {
  id: true,
  userId: true,
  fingerprint: true,
  confidence: true,
  deviceType: true,
  deviceBrand: true,
  deviceModel: true,
  osName: true,
  osVersion: true,
  browserName: true,
  browserVersion: true,
  isBot: true,
  label: true,
  trusted: true,
  trustedAt: true,
  trustedBy: true,
  blockedAt: true,
  blockedBy: true,
  blockReason: true,
  firstSeenAt: true,
  lastSeenAt: true,
  lastIp: true,
  lastCountryCode: true,
  signInCount: true,
  createdAt: true,
  updatedAt: true,
} as const

function buildWhere(
  query: Partial<ListDevicesQuery>
): Prisma.UserDeviceWhereInput {
  const and: Prisma.UserDeviceWhereInput[] = []

  if (query.user_id !== undefined) and.push({ userId: query.user_id })
  if (query.fingerprint !== undefined)
    and.push({ fingerprint: query.fingerprint })
  if (query.device_type !== undefined)
    and.push({ deviceType: query.device_type })
  if (query.trusted !== undefined) and.push({ trusted: query.trusted })
  // "Blocked" is the presence of a blocked_at stamp, not a boolean column — the
  // stamp is what records when, and by whom.
  if (query.blocked !== undefined)
    and.push({ blockedAt: query.blocked ? { not: null } : null })

  if (query.q) {
    const contains = { contains: query.q.trim(), mode: 'insensitive' as const }
    and.push({
      OR: [
        { fingerprint: contains },
        { label: contains },
        { deviceBrand: contains },
        { deviceModel: contains },
        { lastIp: contains },
      ],
    })
  }

  return and.length > 0 ? { AND: and } : {}
}

export function findById(deviceId: string): Promise<DeviceRow | null> {
  return prisma.userDevice.findUnique({
    where: { id: deviceId },
    select: SELECT,
  })
}

/** Every device sharing one fingerprint — the same hardware, different accounts. */
export function listByFingerprint(fingerprint: string): Promise<DeviceRow[]> {
  return prisma.userDevice.findMany({ where: { fingerprint }, select: SELECT })
}

export function list(
  query: ListDevicesQuery | PaginationQuery,
  overrides: Partial<ListDevicesQuery> = {}
): Promise<{ data: DeviceRow[]; hasMore: boolean }> {
  const where = buildWhere({ ...(query as ListDevicesQuery), ...overrides })

  return paginateByCursor<DeviceRow>({
    query,
    loadAnchor: (id) => findById(id),
    // Most-recently-seen first: an admin looking at devices cares when it was
    // last used, not when the row happened to be created.
    cursorOf: (row) => row.lastSeenAt,
    fetch: ({ take, cursor, order }) =>
      prisma.userDevice.findMany({
        where: cursor
          ? {
              AND: [
                where,
                { lastSeenAt: { [cursor.direction]: cursor.value } },
              ],
            }
          : where,
        orderBy: { lastSeenAt: order },
        take,
        select: SELECT,
      }),
  })
}

export type DeviceUpdateInput = {
  label?: string
  trusted?: boolean
  blocked?: boolean
  blockReason?: string
  actorId: string | null
}

/**
 * Apply the admin-editable fields, stamping who changed trust or blocking.
 *
 * Trust and blocking each carry their own actor/timestamp pair, so a device that
 * was trusted and later blocked keeps both facts rather than overwriting one
 * with the other.
 */
export async function update(
  deviceId: string,
  input: DeviceUpdateInput
): Promise<DeviceRow | null> {
  const exists = await prisma.userDevice.findUnique({
    where: { id: deviceId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())
  const data: Prisma.UserDeviceUpdateInput = { updatedAt: now }

  if (input.label !== undefined) data.label = input.label

  if (input.trusted !== undefined) {
    data.trusted = input.trusted
    data.trustedAt = input.trusted ? now : null
    data.trustedBy = input.trusted ? input.actorId : null
  }

  if (input.blocked !== undefined) {
    data.blockedAt = input.blocked ? now : null
    data.blockedBy = input.blocked ? input.actorId : null
    // Unblocking clears the reason: a stale reason on an unblocked device reads
    // as though it were still in force.
    data.blockReason = input.blocked ? (input.blockReason ?? null) : null
  }

  return prisma.userDevice.update({
    where: { id: deviceId },
    data,
    select: SELECT,
  })
}
