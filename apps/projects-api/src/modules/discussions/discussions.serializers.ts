import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

export type DiscussionRow = {
  id: string
  tenantId: string
  projectId: string
  title: string
  body: string
  pinned: boolean
  locked: boolean
  clientVisible: boolean
  authorUserId: string | null
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type DiscussionPostRow = {
  id: string
  tenantId: string
  discussionId: string
  authorUserId: string | null
  body: string
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type DiscussionPostEditRow = {
  id: string
  tenantId: string
  postId: string
  body: string
  editedBy: string | null
  createdAt: bigint | number
}

export type SerializedDiscussion = {
  object: 'projects.discussion'
  id: string
  tenantId: string
  projectId: string
  title: string
  body: string
  pinned: boolean
  locked: boolean
  clientVisible: boolean
  authorUserId: string | null
  postCount: number
  createdAt: number
  updatedAt: number
}

export type SerializedDiscussionPost = {
  object: 'projects.discussion-post'
  id: string
  tenantId: string
  discussionId: string
  authorUserId: string | null
  body: string
  editCount: number
  createdAt: number
  updatedAt: number
}

export type SerializedDiscussionPostEdit = {
  object: 'projects.discussion-post-edit'
  id: string
  postId: string
  body: string
  editedBy: string | null
  createdAt: number
}

export type SerializedDiscussionTombstone = {
  object: 'projects.discussion'
  id: string
  deleted: true
}

export type SerializedVisibility = {
  object: string
  id: string
  clientVisible: boolean
}

export function serializeDiscussion(
  row: DiscussionRow,
  postCount = 0
): SerializedDiscussion {
  return {
    object: 'projects.discussion',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    locked: row.locked,
    clientVisible: row.clientVisible,
    authorUserId: row.authorUserId,
    postCount,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeDiscussionPost(
  row: DiscussionPostRow,
  editCount = 0
): SerializedDiscussionPost {
  return {
    object: 'projects.discussion-post',
    id: row.id,
    tenantId: row.tenantId,
    discussionId: row.discussionId,
    authorUserId: row.authorUserId,
    body: row.body,
    editCount,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeDiscussionPostEdit(
  row: DiscussionPostEditRow
): SerializedDiscussionPostEdit {
  return {
    object: 'projects.discussion-post-edit',
    id: row.id,
    postId: row.postId,
    body: row.body,
    editedBy: row.editedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeVisibility(
  object: string,
  id: string,
  clientVisible: boolean
): SerializedVisibility {
  return { object, id, clientVisible }
}

export function discussionDeletedAt(
  row: DiscussionRow
): number | null {
  return nullableFromDbUnixSeconds(row.deletedAt)
}
