import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as issues from '../issues/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './comments.repository.js'
import type {
  CreateCommentBody,
  ListCommentsQuery,
  UpdateCommentBody,
} from './comments.schemas.js'
import {
  serializeComment,
  type SerializedComment,
  type SerializedCommentTombstone,
} from './comments.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedComments = {
  items: SerializedComment[]
  hasMore: boolean
  totalCount: number | null
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

async function resolveIssue(tenantId: string, issueRef: string) {
  const issue = await issues.resolveIssue(tenantId, issueRef)
  if (!issue || issue.deletedAt !== null)
    return { issue: null, error: getError('projects/issue-not-found') }
  return { issue, error: null }
}

export async function list(
  organizationId: string,
  issueRef: string,
  query: ListCommentsQuery
): Promise<ServiceResult<PaginatedComments>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const issueResolution = await resolveIssue(tenant.id, issueRef)
  if (issueResolution.error !== null)
    return { data: null, error: issueResolution.error }
  const issue = issueResolution.issue

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.list(issue.id, {
    limit,
    startingAfter: query.starting_after,
    endingBefore: query.ending_before,
  })
  const hasMore = rows.length > limit
  const pagedRows = hasMore ? rows.slice(0, limit) : rows
  const totalCount = await repository.count(issue.id)

  return {
    data: {
      items: pagedRows.map(serializeComment),
      hasMore,
      totalCount,
    },
    error: null,
  }
}

export async function retrieve(
  organizationId: string,
  issueRef: string,
  commentId: string
): Promise<ServiceResult<SerializedComment>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const issueResolution = await resolveIssue(tenantResolution.tenant.id, issueRef)
  if (issueResolution.error !== null)
    return { data: null, error: issueResolution.error }

  const row = await repository.retrieve(issueResolution.issue.id, commentId)
  return row
    ? { data: serializeComment(row), error: null }
    : { data: null, error: getError('projects/comment-not-found') }
}

export async function create(
  organizationId: string,
  issueRef: string,
  body: CreateCommentBody
): Promise<ServiceResult<SerializedComment>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const tenant = tenantResolution.tenant

  const issueResolution = await resolveIssue(tenant.id, issueRef)
  if (issueResolution.error !== null)
    return { data: null, error: issueResolution.error }
  const issue = issueResolution.issue

  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  const created = await repository.create({
    id: generateId('comment'),
    tenantId: tenant.id,
    issueId: issue.id,
    authorUserId: body.authorUserId ?? null,
    body: body.body,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  return { data: serializeComment(created), error: null }
}

export async function update(
  organizationId: string,
  issueRef: string,
  commentId: string,
  body: UpdateCommentBody
): Promise<ServiceResult<SerializedComment>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const issueResolution = await resolveIssue(tenantResolution.tenant.id, issueRef)
  if (issueResolution.error !== null)
    return { data: null, error: issueResolution.error }

  const existing = await repository.retrieve(issueResolution.issue.id, commentId)
  if (!existing)
    return { data: null, error: getError('projects/comment-not-found') }

  const updated = await repository.update(commentId, {
    body: body.body,
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })

  return { data: serializeComment(updated), error: null }
}

export async function remove(
  organizationId: string,
  issueRef: string,
  commentId: string
): Promise<ServiceResult<SerializedCommentTombstone>> {
  const tenantResolution = await resolveTenant(organizationId)
  if (tenantResolution.error !== null)
    return { data: null, error: tenantResolution.error }
  const issueResolution = await resolveIssue(tenantResolution.tenant.id, issueRef)
  if (issueResolution.error !== null)
    return { data: null, error: issueResolution.error }

  const existing = await repository.retrieve(issueResolution.issue.id, commentId)
  if (!existing)
    return { data: null, error: getError('projects/comment-not-found') }

  if (process.env.DELETION_MODE === 'hard') await repository.hardDelete(commentId)
  else
    await repository.softDelete(
      commentId,
      toDbUnixSeconds(nowUnixSeconds())
    )

  return {
    data: {
      object: 'projects.comment',
      id: commentId,
      deleted: true,
    },
    error: null,
  }
}
