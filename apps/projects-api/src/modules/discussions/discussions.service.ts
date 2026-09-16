import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as collaboration from '../collaboration/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './discussions.repository.js'
import type {
  CreateDiscussionBody,
  CreatePostBody,
  ListDiscussionsQuery,
  ListPostsQuery,
  UpdateDiscussionBody,
  UpdatePostBody,
} from './discussions.schemas.js'
import {
  serializeDiscussion,
  serializeDiscussionPost,
  serializeVisibility,
  type SerializedDiscussion,
  type SerializedDiscussionPost,
  type SerializedDiscussionTombstone,
  type SerializedVisibility,
} from './discussions.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedDiscussions = {
  items: SerializedDiscussion[]
  hasMore: boolean
  totalCount: number | null
}

export type PaginatedPosts = {
  items: SerializedDiscussionPost[]
  hasMore: boolean
  totalCount: number | null
}

export const DISCUSSION_POST_EDIT_WINDOW_SECONDS = 15 * 60

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveProject(tenantId: string, projectIdOrKey: string) {
  const project = await projects.resolveProject(tenantId, projectIdOrKey)
  if (!project)
    return { project: null, error: getError('projects/project-not-found') }
  return { project, error: null }
}

export function postEditWindowOpen(
  postCreatedAt: bigint | number,
  nowSeconds: number
): boolean {
  return (
    nowSeconds - fromDbUnixSeconds(postCreatedAt) <=
    DISCUSSION_POST_EDIT_WINDOW_SECONDS
  )
}

async function resolveDiscussion(
  tenantId: string,
  projectId: string,
  discussionId: string
) {
  const discussion = await repository.retrieveDiscussion(
    tenantId,
    projectId,
    discussionId
  )
  if (!discussion)
    return {
      discussion: null,
      error: getError('projects/discussion-not-found'),
    }
  return { discussion, error: null }
}

export async function listDiscussions(
  organizationId: string,
  projectIdOrKey: string,
  query: ListDiscussionsQuery
): Promise<ServiceResult<PaginatedDiscussions>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listDiscussions(
    tenant.id,
    projectResolution.project.id,
    {
      limit,
      startingAfter: query.starting_after,
      includeDeleted: query.include_deleted === 'true',
    }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  const items: SerializedDiscussion[] = []
  for (const row of paged) {
    items.push(
      serializeDiscussion(row, await repository.countPosts(row.id))
    )
  }
  return { data: { items, hasMore, totalCount: null }, error: null }
}

export async function createDiscussion(
  organizationId: string,
  projectIdOrKey: string,
  body: CreateDiscussionBody
): Promise<ServiceResult<SerializedDiscussion>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }
  const project = projectResolution.project

  const timestamp = now()
  const created = await repository.createDiscussion({
    id: generateId('discussion'),
    tenantId: tenant.id,
    projectId: project.id,
    title: body.title,
    body: body.body,
    pinned: body.pinned ?? false,
    authorUserId: body.authorUserId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  const mentioned = collaboration.mentionedUserIds(
    `${body.title}\n${body.body}`,
    body.authorUserId ?? null
  )
  const follows: Array<{
    subjectType: string
    subjectId: string
    userId: string
  }> = []
  if (body.authorUserId)
    follows.push({
      subjectType: 'project',
      subjectId: project.id,
      userId: body.authorUserId,
    })
  for (const userId of mentioned)
    follows.push({ subjectType: 'project', subjectId: project.id, userId })
  await collaboration.ensureFollows(
    repository.discussionWriter(),
    tenant.id,
    follows
  )
  await collaboration.notifyMentionedUsers({
    tenantId: tenant.id,
    userIds: mentioned,
    subjectType: 'discussion',
    subjectId: created.id,
    title: `You were mentioned in ${body.title}`,
  })

  return { data: serializeDiscussion(created, 0), error: null }
}

export async function retrieveDiscussion(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string
): Promise<ServiceResult<SerializedDiscussion>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }
  return {
    data: serializeDiscussion(
      resolution.discussion,
      await repository.countPosts(resolution.discussion.id)
    ),
    error: null,
  }
}

export async function updateDiscussion(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  body: UpdateDiscussionBody
): Promise<ServiceResult<SerializedDiscussion>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const updated = await repository.updateDiscussion(resolution.discussion.id, {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.body !== undefined ? { body: body.body } : {}),
    ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
    ...(body.locked !== undefined ? { locked: body.locked } : {}),
    updatedAt: now(),
  })

  if (body.body !== undefined) {
    const mentioned = collaboration.mentionedUserIds(body.body, null)
    const follows = mentioned.map((userId) => ({
      subjectType: 'project',
      subjectId: projectResolution.project.id,
      userId,
    }))
    await collaboration.ensureFollows(
      repository.discussionWriter(),
      tenant.id,
      follows
    )
    await collaboration.notifyMentionedUsers({
      tenantId: tenant.id,
      userIds: mentioned,
      subjectType: 'discussion',
      subjectId: updated.id,
      title: `You were mentioned in ${updated.title}`,
    })
  }

  return {
    data: serializeDiscussion(
      updated,
      await repository.countPosts(updated.id)
    ),
    error: null,
  }
}

export async function removeDiscussion(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string
): Promise<ServiceResult<SerializedDiscussionTombstone>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }

  if (process.env.DELETION_MODE === 'hard')
    await repository.hardDeleteDiscussion(resolution.discussion.id)
  else await repository.softDeleteDiscussion(resolution.discussion.id, now())

  return {
    data: {
      object: 'projects.discussion',
      id: discussionId,
      deleted: true,
    },
    error: null,
  }
}

export async function setDiscussionVisibility(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  clientVisible: boolean
): Promise<ServiceResult<SerializedVisibility>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const updated = await repository.setDiscussionVisibility(
    resolution.discussion.id,
    clientVisible,
    now()
  )
  return {
    data: serializeVisibility(
      'projects.discussion',
      updated.id,
      updated.clientVisible
    ),
    error: null,
  }
}

export async function listPosts(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  query: ListPostsQuery
): Promise<ServiceResult<PaginatedPosts>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listPosts(resolution.discussion.id, {
    limit,
    startingAfter: query.starting_after,
  })
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  const items: SerializedDiscussionPost[] = []
  for (const row of paged) {
    items.push(
      serializeDiscussionPost(row, await repository.countPostEdits(row.id))
    )
  }
  return { data: { items, hasMore, totalCount: null }, error: null }
}

export async function createPost(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  body: CreatePostBody
): Promise<ServiceResult<SerializedDiscussionPost>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }
  if (resolution.discussion.locked)
    return { data: null, error: getError('projects/discussion-locked') }

  const timestamp = now()
  const created = await repository.createPost({
    id: generateId('discussionPost'),
    tenantId: tenant.id,
    discussionId: resolution.discussion.id,
    authorUserId: body.authorUserId ?? null,
    body: body.body,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  const mentioned = collaboration.mentionedUserIds(
    body.body,
    body.authorUserId ?? null
  )
  const follows: Array<{
    subjectType: string
    subjectId: string
    userId: string
  }> = []
  if (body.authorUserId)
    follows.push({
      subjectType: 'project',
      subjectId: projectResolution.project.id,
      userId: body.authorUserId,
    })
  for (const userId of mentioned)
    follows.push({
      subjectType: 'project',
      subjectId: projectResolution.project.id,
      userId,
    })
  await collaboration.ensureFollows(
    repository.discussionWriter(),
    tenant.id,
    follows
  )
  await collaboration.notifyMentionedUsers({
    tenantId: tenant.id,
    userIds: mentioned,
    subjectType: 'discussion',
    subjectId: resolution.discussion.id,
    title: `You were mentioned in ${resolution.discussion.title}`,
  })

  return { data: serializeDiscussionPost(created, 0), error: null }
}

export async function updatePost(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  postId: string,
  body: UpdatePostBody,
  nowSeconds: number = nowUnixSeconds()
): Promise<ServiceResult<SerializedDiscussionPost>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }
  if (resolution.discussion.locked)
    return { data: null, error: getError('projects/discussion-locked') }

  const existing = await repository.retrievePost(
    resolution.discussion.id,
    postId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/discussion-post-not-found'),
    }
  if (existing.authorUserId !== body.authorUserId)
    return {
      data: null,
      error: getError('projects/discussion-post-forbidden'),
    }

  if (
    !postEditWindowOpen(existing.createdAt, nowSeconds) &&
    existing.body !== body.body
  ) {
    await repository.recordPostEdit({
      id: generateId('discussionPostEdit'),
      tenantId: tenant.id,
      postId: existing.id,
      body: existing.body,
      editedBy: body.authorUserId,
      createdAt: toDbUnixSeconds(nowSeconds),
    })
  }

  const updated = await repository.updatePost(existing.id, {
    body: body.body,
    updatedAt: toDbUnixSeconds(nowSeconds),
  })

  const mentioned = collaboration.mentionedUserIds(body.body, body.authorUserId)
  const follows = mentioned.map((userId) => ({
    subjectType: 'project',
    subjectId: projectResolution.project.id,
    userId,
  }))
  await collaboration.ensureFollows(
    repository.discussionWriter(),
    tenant.id,
    follows
  )
  await collaboration.notifyMentionedUsers({
    tenantId: tenant.id,
    userIds: mentioned,
    subjectType: 'discussion',
    subjectId: resolution.discussion.id,
    title: `You were mentioned in ${resolution.discussion.title}`,
  })

  return {
    data: serializeDiscussionPost(
      updated,
      await repository.countPostEdits(updated.id)
    ),
    error: null,
  }
}

export async function removePost(
  organizationId: string,
  projectIdOrKey: string,
  discussionId: string,
  postId: string
): Promise<ServiceResult<SerializedDiscussionTombstone>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const projectResolution = await resolveProject(tenant.id, projectIdOrKey)
  if (projectResolution.error)
    return { data: null, error: projectResolution.error }

  const resolution = await resolveDiscussion(
    tenant.id,
    projectResolution.project.id,
    discussionId
  )
  if (resolution.error) return { data: null, error: resolution.error }

  const existing = await repository.retrievePost(
    resolution.discussion.id,
    postId
  )
  if (!existing)
    return {
      data: null,
      error: getError('projects/discussion-post-not-found'),
    }

  if (process.env.DELETION_MODE === 'hard')
    await repository.hardDeletePost(existing.id)
  else await repository.softDeletePost(existing.id, now())

  return {
    data: {
      object: 'projects.discussion',
      id: postId,
      deleted: true,
    },
    error: null,
  }
}
