import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export const ACTIVITY_KINDS = [
  'issue-event',
  'milestone-event',
  'timesheet-event',
  'automation-run',
] as const

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export type ActivitySourceRow = {
  id: string
  kind: ActivityKind
  subjectType: string
  subjectId: string
  actorUserId: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  createdAt: bigint | number
}

export type SerializedActivityItem = {
  object: 'projects.activity-item'
  id: string
  kind: ActivityKind
  subjectType: string
  subjectId: string
  actorUserId: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  createdAt: number
}

export function serializeActivityItem(
  row: ActivitySourceRow
): SerializedActivityItem {
  return {
    object: 'projects.activity-item',
    id: row.id,
    kind: row.kind,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    actorUserId: row.actorUserId,
    type: row.type,
    fromValue: row.fromValue,
    toValue: row.toValue,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function encodeActivityCursor(item: {
  createdAt: number
  id: string
}): string {
  return `${item.createdAt}:${item.id}`
}

export function decodeActivityCursor(cursor: string): {
  createdAt: bigint
  id: string
} | null {
  const separator = cursor.indexOf(':')
  if (separator <= 0) return null
  const createdAt = Number(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)
  if (!Number.isInteger(createdAt) || createdAt < 0 || id.length === 0)
    return null
  return { createdAt: BigInt(createdAt), id }
}
