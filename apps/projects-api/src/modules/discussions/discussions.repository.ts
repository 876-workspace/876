import { prisma } from '../../db/index.js'
import type {
  DiscussionPostRow,
  DiscussionRow,
} from './discussions.serializers.js'

export async function listDiscussions(
  tenantId: string,
  projectId: string,
  options: {
    limit: number
    startingAfter?: string
    includeDeleted: boolean
  }
): Promise<DiscussionRow[]> {
  const rows = await prisma.discussion.findMany({
    where: {
      tenantId,
      projectId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  })
  return rows as DiscussionRow[]
}

export async function retrieveDiscussion(
  tenantId: string,
  projectId: string,
  id: string
): Promise<DiscussionRow | null> {
  const row = await prisma.discussion.findFirst({
    where: { tenantId, projectId, id, deletedAt: null },
  })
  return (row ?? null) as DiscussionRow | null
}

export async function createDiscussion(params: {
  id: string
  tenantId: string
  projectId: string
  title: string
  body: string
  pinned: boolean
  authorUserId: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<DiscussionRow> {
  const row = await prisma.discussion.create({ data: params })
  return row as DiscussionRow
}

export async function updateDiscussion(
  id: string,
  params: {
    title?: string
    body?: string
    pinned?: boolean
    locked?: boolean
    updatedAt: bigint
  }
): Promise<DiscussionRow> {
  const row = await prisma.discussion.update({ where: { id }, data: params })
  return row as DiscussionRow
}

export async function setDiscussionVisibility(
  id: string,
  clientVisible: boolean,
  updatedAt: bigint
): Promise<DiscussionRow> {
  const row = await prisma.discussion.update({
    where: { id },
    data: { clientVisible, updatedAt },
  })
  return row as DiscussionRow
}

export async function softDeleteDiscussion(
  id: string,
  deletedAt: bigint
): Promise<void> {
  await prisma.discussion.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function hardDeleteDiscussion(id: string): Promise<void> {
  await prisma.discussion.delete({ where: { id } })
}

export async function countPosts(discussionId: string): Promise<number> {
  return prisma.discussionPost.count({
    where: { discussionId, deletedAt: null },
  })
}

export async function listPosts(
  discussionId: string,
  options: { limit: number; startingAfter?: string }
): Promise<DiscussionPostRow[]> {
  const rows = await prisma.discussionPost.findMany({
    where: { discussionId, deletedAt: null },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })
  return rows as DiscussionPostRow[]
}

export async function listVisiblePosts(
  tenantId: string,
  discussionId: string,
  options: { limit: number; startingAfter?: string }
): Promise<DiscussionPostRow[]> {
  const rows = await prisma.discussionPost.findMany({
    where: { tenantId, discussionId, deletedAt: null },
    cursor: options.startingAfter ? { id: options.startingAfter } : undefined,
    skip: options.startingAfter ? 1 : 0,
    take: options.limit + 1,
    orderBy: { createdAt: 'asc' },
  })
  return rows as DiscussionPostRow[]
}

export async function retrievePost(
  discussionId: string,
  id: string
): Promise<DiscussionPostRow | null> {
  const row = await prisma.discussionPost.findFirst({
    where: { discussionId, id, deletedAt: null },
  })
  return (row ?? null) as DiscussionPostRow | null
}

export async function createPost(params: {
  id: string
  tenantId: string
  discussionId: string
  authorUserId: string | null
  body: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<DiscussionPostRow> {
  const row = await prisma.discussionPost.create({ data: params })
  return row as DiscussionPostRow
}

export async function updatePost(
  id: string,
  params: { body: string; updatedAt: bigint }
): Promise<DiscussionPostRow> {
  const row = await prisma.discussionPost.update({
    where: { id },
    data: params,
  })
  return row as DiscussionPostRow
}

export async function recordPostEdit(params: {
  id: string
  tenantId: string
  postId: string
  body: string
  editedBy: string | null
  createdAt: bigint
}): Promise<void> {
  await prisma.discussionPostEdit.create({ data: params })
}

export async function countPostEdits(postId: string): Promise<number> {
  return prisma.discussionPostEdit.count({ where: { postId } })
}

export async function listPostEdits(postId: string): Promise<
  Array<{
    id: string
    tenantId: string
    postId: string
    body: string
    editedBy: string | null
    createdAt: bigint
  }>
> {
  return prisma.discussionPostEdit.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function softDeletePost(
  id: string,
  deletedAt: bigint
): Promise<void> {
  await prisma.discussionPost.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function hardDeletePost(id: string): Promise<void> {
  await prisma.discussionPost.delete({ where: { id } })
}

/**
 * Writer handle for cross-cutting follow writes. The collaboration module
 * owns the followers table; this handle lets its public `ensureFollows`
 * write in the caller's logical transaction without this module importing
 * another module's repository.
 */
export function discussionWriter(): Pick<typeof prisma, 'follower'> {
  return prisma
}
