import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type { ListAuditEventsQuery } from './audit-events.schemas'
import type { AuditEventRow } from './audit-events.serializers'

/**
 * Every query against `audit_events`.
 *
 * The list is cursor-paginated on `(created_at, id)` rather than on `created_at`
 * alone: events arrive in bursts and routinely share a second, so a single-column
 * cursor would skip or repeat rows at a page boundary. That is why this module
 * builds its own cursor predicate instead of using `paginateByCursor`, which
 * covers the single-column case.
 */

const SELECT = {
  id: true,
  event: true,
  source: true,
  appName: true,
  appId: true,
  userId: true,
  path: true,
  search: true,
  referrer: true,
  title: true,
  requestId: true,
  sessionId: true,
  distinctId: true,
  properties: true,
  createdAt: true,
} as const

export type CreateAuditEventInput = {
  id: string
  event: string
  source: string
  appName: string
  appId: string | null
  userId: string | null
  path: string | null
  search: string | null
  referrer: string | null
  title: string | null
  requestId: string | null
  sessionId: string | null
  distinctId: string | null
  properties: Record<string, unknown>
  createdAt: number
}

export function create(input: CreateAuditEventInput): Promise<AuditEventRow> {
  return prisma.auditEvent.create({
    data: {
      ...input,
      properties: input.properties as Prisma.InputJsonValue,
      createdAt: BigInt(input.createdAt),
    },
    select: SELECT,
  })
}

function buildFilters(
  query: ListAuditEventsQuery
): Prisma.AuditEventWhereInput[] {
  const filters: Prisma.AuditEventWhereInput[] = []

  if (query.app_name) filters.push({ appName: query.app_name })
  if (query.event) filters.push({ event: query.event })
  if (query.user_id) filters.push({ userId: query.user_id })
  if (query.path)
    filters.push({ path: { contains: query.path, mode: 'insensitive' } })

  if (query.q) {
    const contains = { contains: query.q, mode: 'insensitive' as const }
    filters.push({
      OR: [
        { event: contains },
        { appName: contains },
        { path: contains },
        { requestId: contains },
        { userId: contains },
      ],
    })
  }

  return filters
}

/** The `(created_at, id)` half-open predicate, in the requested direction. */
function cursorPredicate(
  anchor: { createdAt: bigint; id: string },
  direction: 'before' | 'after'
): Prisma.AuditEventWhereInput {
  const op = direction === 'after' ? 'lt' : 'gt'
  return {
    OR: [
      { createdAt: { [op]: anchor.createdAt } },
      { createdAt: anchor.createdAt, id: { [op]: anchor.id } },
    ],
  }
}

export function count(query: ListAuditEventsQuery): Promise<number> {
  return prisma.auditEvent.count({ where: { AND: buildFilters(query) } })
}

export async function list(query: ListAuditEventsQuery): Promise<{
  data: AuditEventRow[]
  hasMore: boolean
  totalCount: number
}> {
  const filters = buildFilters(query)
  const totalCount = await count(query)

  const anchorId = query.starting_after ?? query.ending_before
  if (anchorId) {
    const anchor = await prisma.auditEvent.findUnique({
      where: { id: anchorId },
      select: { id: true, createdAt: true },
    })
    // An unknown anchor yields an empty page rather than an error, matching the
    // FastAPI repository — a stale cursor is a client's problem to notice, not a
    // reason to fail their request.
    if (!anchor) return { data: [], hasMore: false, totalCount }

    const forward = Boolean(query.starting_after)
    filters.push(cursorPredicate(anchor, forward ? 'after' : 'before'))

    const rows = await fetch(filters, query.limit, forward ? 'desc' : 'asc')
    const page = rows.slice(0, query.limit)

    return {
      // Always hand back descending order, whichever way the cursor walked.
      data: forward ? page : page.reverse(),
      hasMore: rows.length > query.limit,
      totalCount,
    }
  }

  const rows = await fetch(filters, query.limit, 'desc')
  return {
    data: rows.slice(0, query.limit),
    hasMore: rows.length > query.limit,
    totalCount,
  }
}

function fetch(
  filters: Prisma.AuditEventWhereInput[],
  limit: number,
  order: 'asc' | 'desc'
): Promise<AuditEventRow[]> {
  return prisma.auditEvent.findMany({
    where: { AND: filters },
    orderBy: [{ createdAt: order }, { id: order }],
    // One extra row decides `has_more` without a second count query.
    take: limit + 1,
    select: SELECT,
  })
}
