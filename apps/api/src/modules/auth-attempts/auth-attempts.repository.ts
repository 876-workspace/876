import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'

import type { ListAuthAttemptsQuery } from './auth-attempts.schemas'
import type { AuthAttemptRow } from './auth-attempts.serializers'

/** Every query against `auth_attempts`. */

const SELECT = {
  id: true,
  event: true,
  outcome: true,
  failureCode: true,
  identifier: true,
  userId: true,
  appId: true,
  sessionId: true,
  realm: true,
  deviceId: true,
  deviceFingerprint: true,
  ipAddress: true,
  ipCountryCode: true,
  ipRegionCode: true,
  ipRegion: true,
  ipCity: true,
  ipPostalCode: true,
  ipTimezone: true,
  ipLatitude: true,
  ipLongitude: true,
  ipAsn: true,
  ipAsOrganization: true,
  userAgent: true,
  deviceType: true,
  deviceBrand: true,
  deviceModel: true,
  osName: true,
  osVersion: true,
  browserName: true,
  browserVersion: true,
  isBot: true,
  contextTrusted: true,
  riskScore: true,
  riskReasons: true,
  requestId: true,
  createdAt: true,
} as const

/**
 * Every filter narrows with AND.
 *
 * An identifier is matched lower-cased and a country code upper-cased, because
 * that is the case each is stored in — a filter that missed on case would
 * quietly return nothing rather than an error, which is the worst failure mode
 * for a security console.
 */
export function buildWhere(
  query: Partial<ListAuthAttemptsQuery> & { device_id?: string }
): Prisma.AuthAttemptWhereInput {
  const and: Prisma.AuthAttemptWhereInput[] = []

  if (query.user_id !== undefined) and.push({ userId: query.user_id })
  if (query.identifier !== undefined)
    and.push({ identifier: query.identifier.toLowerCase() })
  if (query.event !== undefined) and.push({ event: query.event })
  if (query.outcome !== undefined) and.push({ outcome: query.outcome })
  if (query.ip_address !== undefined) and.push({ ipAddress: query.ip_address })
  if (query.ip_country_code !== undefined)
    and.push({ ipCountryCode: query.ip_country_code.toUpperCase() })
  if (query.device_fingerprint !== undefined)
    and.push({ deviceFingerprint: query.device_fingerprint })
  if (query.device_id !== undefined) and.push({ deviceId: query.device_id })
  if (query.app_id !== undefined) and.push({ appId: query.app_id })
  if (query.created_after !== undefined)
    and.push({ createdAt: { gte: BigInt(query.created_after) } })
  if (query.created_before !== undefined)
    and.push({ createdAt: { lte: BigInt(query.created_before) } })

  if (query.q) {
    const contains = { contains: query.q.trim(), mode: 'insensitive' as const }
    and.push({
      OR: [
        { identifier: contains },
        { ipAddress: contains },
        { deviceFingerprint: contains },
      ],
    })
  }

  return and.length > 0 ? { AND: and } : {}
}

export function findById(attemptId: string): Promise<AuthAttemptRow | null> {
  return prisma.authAttempt.findUnique({
    where: { id: attemptId },
    select: SELECT,
  })
}

export function list(
  query: PaginationQuery,
  where: Prisma.AuthAttemptWhereInput
): Promise<{ data: AuthAttemptRow[]; hasMore: boolean }> {
  return paginateByCursor<AuthAttemptRow>({
    query,
    loadAnchor: (id) => findById(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.authAttempt.findMany({
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

export type SummaryTotals = {
  total: number
  outcomes: Record<string, number>
  topCountries: { value: string; count: number }[]
  topFailureCodes: { value: string; count: number }[]
  topFailureIps: { value: string; count: number }[]
}

/**
 * The attempt summary for one window.
 *
 * Five aggregates over the same window run concurrently: they are independent,
 * and awaiting them in sequence would pay five round trips to answer one
 * dashboard request.
 */
export async function summary(since: number): Promise<SummaryTotals> {
  const window: Prisma.AuthAttemptWhereInput = {
    createdAt: { gte: BigInt(since) },
  }
  const failures: Prisma.AuthAttemptWhereInput = {
    ...window,
    outcome: 'failed',
  }

  const [total, outcomeRows, countries, failureCodes, failureIps] =
    await Promise.all([
      prisma.authAttempt.count({ where: window }),
      prisma.authAttempt.groupBy({
        by: ['outcome'],
        where: window,
        _count: { _all: true },
      }),
      topValues('ipCountryCode', window),
      topValues('failureCode', failures),
      topValues('ipAddress', failures),
    ])

  return {
    total,
    outcomes: Object.fromEntries(
      outcomeRows.map((row) => [row.outcome, row._count._all])
    ),
    topCountries: countries,
    topFailureCodes: failureCodes,
    topFailureIps: failureIps,
  }
}

/** The ten most frequent non-null values of one column in a window. */
async function topValues(
  column: 'ipCountryCode' | 'failureCode' | 'ipAddress',
  where: Prisma.AuthAttemptWhereInput
): Promise<{ value: string; count: number }[]> {
  const rows = await prisma.authAttempt.groupBy({
    by: [column],
    where,
    _count: { _all: true },
    orderBy: { _count: { [column]: 'desc' } },
    take: 10,
  })

  return rows
    .map((row) => ({
      value: (row as Record<string, unknown>)[column],
      count: row._count._all,
    }))
    .filter(
      (row): row is { value: string; count: number } => row.value !== null
    )
}
