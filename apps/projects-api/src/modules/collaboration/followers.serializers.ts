import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type FollowerRow = {
  id: string
  tenantId: string
  subjectType: string
  subjectId: string
  userId: string
  createdAt: bigint | number
}

export type SerializedFollower = {
  object: 'projects.follower'
  id: string
  tenantId: string
  subjectType: string
  subjectId: string
  userId: string
  createdAt: number
}

export function serializeFollower(row: FollowerRow): SerializedFollower {
  return {
    object: 'projects.follower',
    id: row.id,
    tenantId: row.tenantId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    userId: row.userId,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}
