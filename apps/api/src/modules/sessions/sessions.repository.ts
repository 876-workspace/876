import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'
import { nowUnixSeconds } from '@/platform/timestamps'

import type { SessionStatus } from './sessions.schemas'
import type { SessionRow } from './sessions.serializers'

/** Every query against `sessions`. */

const SELECT = {
  id: true,
  userId: true,
  appId: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true,
  deviceId: true,
  ipCountryCode: true,
  ipRegion: true,
  ipCity: true,
  ipAsn: true,
  ipAsOrganization: true,
  lastSeenAt: true,
  revokedAt: true,
  revokedBy: true,
  createdAt: true,
  updatedAt: true,
} as const

export type SessionFilters = {
  userId?: string
  deviceId?: string
  active?: boolean
  status?: SessionStatus
}

/**
 * `status` wins over `active` when both are given, matching the FastAPI
 * repository: the precise filter should not be overridden by the coarse one.
 */
function buildWhere(filters: SessionFilters): Prisma.SessionWhereInput {
  const where: Prisma.SessionWhereInput = {}
  const now = BigInt(nowUnixSeconds())

  if (filters.userId !== undefined) where.userId = filters.userId
  if (filters.deviceId !== undefined) where.deviceId = filters.deviceId

  if (filters.status !== undefined) {
    if (filters.status === 'active') {
      where.expiresAt = { gt: now }
      where.revokedAt = null
    } else if (filters.status === 'revoked') {
      where.revokedAt = { not: null }
    } else {
      where.revokedAt = null
      where.expiresAt = { lte: now }
    }
    return where
  }

  if (filters.active !== undefined) {
    if (filters.active) {
      where.expiresAt = { gt: now }
      where.revokedAt = null
    } else {
      where.OR = [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }]
    }
  }

  return where
}

export function findById(sessionId: string): Promise<SessionRow | null> {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: SELECT,
  })
}

export function list(
  query: PaginationQuery,
  filters: SessionFilters
): Promise<{ data: SessionRow[]; hasMore: boolean }> {
  const where = buildWhere(filters)

  return paginateByCursor<SessionRow>({
    query,
    loadAnchor: (id) => findById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.session.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: SELECT,
      }),
  })
}

/**
 * Mark a session revoked without deleting it.
 *
 * The row is kept so Console can still show where and on what device the
 * session was established after it has been cut off — deleting it would erase
 * exactly the evidence an investigation needs. `expires_at` is pulled back to
 * now so every expiry check treats it as dead immediately.
 */
export async function revoke(
  sessionId: string,
  revokedBy: string | null
): Promise<SessionRow | null> {
  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { expiresAt: true },
  })
  if (!existing) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.session.update({
    where: { id: sessionId },
    data: {
      revokedAt: now,
      revokedBy,
      expiresAt: existing.expiresAt < now ? existing.expiresAt : now,
      updatedAt: now,
    },
    select: SELECT,
  })
}

/** Revoke every live session for a user. Returns how many were cut off. */
export async function revokeAllForUser(
  userId: string,
  revokedBy: string | null
): Promise<number> {
  const now = BigInt(nowUnixSeconds())

  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now, revokedBy, expiresAt: now, updatedAt: now },
  })

  return result.count
}
