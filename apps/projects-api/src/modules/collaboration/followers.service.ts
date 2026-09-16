import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as automation from '../automation/index.js'
import * as issues from '../issues/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as repository from './followers.repository.js'
import type { FollowClient, FollowSeed } from './followers.repository.js'
import type { FollowBody, ListFollowersQuery } from './followers.schemas.js'
import {
  serializeFollower,
  type SerializedFollower,
} from './followers.serializers.js'
import { parseMentionedUserIds } from './mentions.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedFollowers = {
  items: SerializedFollower[]
  hasMore: boolean
  totalCount: number | null
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveSubject(
  tenantId: string,
  subjectType: string,
  subjectId: string
): Promise<ProjectsError | null> {
  if (subjectType === 'project') {
    const project = await projects.resolveProject(tenantId, subjectId)
    return project ? null : getError('projects/project-not-found')
  }
  if (subjectType === 'work-item') {
    const issue = await issues.resolveIssue(tenantId, subjectId)
    return issue && issue.deletedAt === null
      ? null
      : getError('projects/issue-not-found')
  }
  const milestone = await workStructure.resolveMilestoneById(
    tenantId,
    subjectId
  )
  return milestone ? null : getError('projects/milestone-not-found')
}

/**
 * Records follows inside the caller's transaction. Owning services pass
 * their transaction client so creator/assignee/mentioned follows commit
 * atomically with the mutation that caused them.
 */
export async function ensureFollows(
  client: FollowClient,
  tenantId: string,
  follows: FollowSeed[]
): Promise<void> {
  const wanted = follows.filter((follow) => follow.userId.trim().length > 0)
  if (wanted.length === 0) return
  await repository.upsertFollows(client, {
    id: () => generateId('follower'),
    tenantId,
    follows: wanted,
    createdAt: now(),
  })
}

export async function follow(
  organizationId: string,
  body: FollowBody
): Promise<ServiceResult<SerializedFollower>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const subjectError = await resolveSubject(
    tenant.id,
    body.subjectType,
    body.subjectId
  )
  if (subjectError) return { data: null, error: subjectError }

  const created = await repository.followOne(tenant.id, {
    id: generateId('follower'),
    subjectType: body.subjectType,
    subjectId: body.subjectId,
    userId: body.userId,
    createdAt: now(),
  })
  return { data: serializeFollower(created), error: null }
}

export async function unfollow(
  organizationId: string,
  subjectType: string,
  subjectId: string,
  userId: string
): Promise<ServiceResult<{ unfollowed: boolean }>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const removed = await repository.removeFollow(
    tenant.id,
    subjectType,
    subjectId,
    userId
  )
  return { data: { unfollowed: removed }, error: null }
}

export async function list(
  organizationId: string,
  query: ListFollowersQuery
): Promise<ServiceResult<PaginatedFollowers>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listForSubject(
    tenant.id,
    query.subjectType,
    query.subjectId,
    { limit, startingAfter: query.starting_after }
  )
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  return {
    data: {
      items: paged.map(serializeFollower),
      hasMore,
      totalCount: null,
    },
    error: null,
  }
}

export async function notifyMentionedUsers(params: {
  tenantId: string
  userIds: string[]
  subjectType: string
  subjectId: string
  title: string
}): Promise<void> {
  for (const userId of params.userIds) {
    await automation.createNotificationRecord(params.tenantId, {
      userId,
      kind: 'mention',
      title: params.title,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
    })
  }
}

export function mentionedUserIds(
  body: string,
  authorUserId?: string | null
): string[] {
  return parseMentionedUserIds(body, { selfUserId: authorUserId ?? null })
}

/**
 * Records follows outside an owning-service transaction. Transactional
 * callers use `ensureFollows` with their own client instead.
 */
export async function ensureFollowsForTenant(
  tenantId: string,
  follows: FollowSeed[]
): Promise<void> {
  const wanted = follows.filter((follow) => follow.userId.trim().length > 0)
  if (wanted.length === 0) return
  await repository.upsertTenantFollows({
    id: () => generateId('follower'),
    tenantId,
    follows: wanted,
    createdAt: now(),
  })
}
