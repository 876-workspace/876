import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type CommentRow = {
  id: string
  tenantId: string
  issueId: string
  authorUserId: string | null
  body: string
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedComment = {
  object: 'projects.comment'
  id: string
  tenantId: string
  issueId: string
  authorUserId: string | null
  body: string
  createdAt: number
  updatedAt: number
}

export type SerializedCommentTombstone = {
  object: 'projects.comment'
  id: string
  deleted: true
}

export function serializeComment(row: CommentRow): SerializedComment {
  return {
    object: 'projects.comment',
    id: row.id,
    tenantId: row.tenantId,
    issueId: row.issueId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
