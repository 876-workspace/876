import { getError, type ProjectsError } from '../../http/errors.js'
import * as collaboration from '../collaboration/index.js'
import * as comments from '../comments/index.js'
import * as discussions from '../discussions/index.js'
import * as finance from '../finance/index.js'
import * as issues from '../issues/index.js'
import * as time from '../time/index.js'
import * as wiki from '../wiki/index.js'
import * as workStructure from '../work-structure/index.js'
import { milestoneDetails } from '../work-structure/index.js'
import * as attachments from './attachment-links.service.js'
import type { ClientGrantRow } from './client-grants.serializers.js'
import type { PortalActivityQuery, PortalListQuery } from './portal.schemas.js'
import {
  serializePortalAttachment,
  serializePortalComment,
  serializePortalDiscussion,
  serializePortalDiscussionPost,
  serializePortalIssue,
  serializePortalMilestone,
  serializePortalMilestoneComment,
  serializePortalWikiPage,
  type PortalActivityItem,
  type PortalAttachment,
  type PortalComment,
  type PortalDiscussion,
  type PortalDiscussionPost,
  type PortalInvoice,
  type PortalIssue,
  type PortalMilestone,
  type PortalMilestoneComment,
  type PortalPhaseHours,
  type PortalWikiPage,
} from './portal.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type PortalScope = {
  organizationId: string
  tenantId: string
  projectId: string
  grant: ClientGrantRow
  portalUserId: string
}

function flagError(flag: boolean): ProjectsError | null {
  return flag ? null : getError('projects/portal-forbidden')
}

function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

export async function listIssues(
  scope: PortalScope,
  query: PortalListQuery
): Promise<ServiceResult<{ items: PortalIssue[]; hasMore: boolean }>> {
  const result = await issues.listVisibleIssues(
    scope.organizationId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: {
      items: result.data.items.map(serializePortalIssue),
      hasMore: result.data.hasMore,
    },
    error: null,
  }
}

export async function retrieveIssue(
  scope: PortalScope,
  issueRef: string
): Promise<ServiceResult<PortalIssue>> {
  const result = await issues.retrieveVisibleIssue(
    scope.organizationId,
    scope.projectId,
    issueRef
  )
  if (result.error) return { data: null, error: result.error }
  return { data: serializePortalIssue(result.data), error: null }
}

export async function listIssueComments(
  scope: PortalScope,
  issueRef: string
): Promise<ServiceResult<PortalComment[]>> {
  const denied = flagError(scope.grant.allowComments)
  if (denied) return { data: null, error: denied }
  const issue = await issues.retrieveVisibleIssue(
    scope.organizationId,
    scope.projectId,
    issueRef
  )
  if (issue.error) return { data: null, error: issue.error }
  const result = await comments.listVisibleComments(
    scope.organizationId,
    issue.data.identifier
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: result.data.map(serializePortalComment),
    error: null,
  }
}

export async function listMilestones(
  scope: PortalScope,
  query: PortalListQuery
): Promise<ServiceResult<{ items: PortalMilestone[]; hasMore: boolean }>> {
  const result = await workStructure.listVisibleMilestones(
    scope.organizationId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const hasMore = result.data.length > limit
  const paged = hasMore ? result.data.slice(0, limit) : result.data
  return {
    data: { items: paged.map(serializePortalMilestone), hasMore },
    error: null,
  }
}

export async function retrieveMilestone(
  scope: PortalScope,
  milestoneId: string
): Promise<ServiceResult<PortalMilestone>> {
  const result = await workStructure.retrieveVisibleMilestone(
    scope.organizationId,
    scope.projectId,
    milestoneId
  )
  if (result.error) return { data: null, error: result.error }
  return { data: serializePortalMilestone(result.data), error: null }
}

export async function listMilestoneComments(
  scope: PortalScope,
  milestoneId: string
): Promise<ServiceResult<PortalMilestoneComment[]>> {
  const denied = flagError(scope.grant.allowComments)
  if (denied) return { data: null, error: denied }
  const milestone = await workStructure.retrieveVisibleMilestone(
    scope.organizationId,
    scope.projectId,
    milestoneId
  )
  if (milestone.error) return { data: null, error: milestone.error }
  const result = await milestoneDetails.listVisibleMilestoneComments(
    scope.organizationId,
    milestone.data.id
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: result.data.map(serializePortalMilestoneComment),
    error: null,
  }
}

export async function listDiscussions(
  scope: PortalScope,
  query: PortalListQuery
): Promise<ServiceResult<{ items: PortalDiscussion[]; hasMore: boolean }>> {
  const denied = flagError(scope.grant.allowDiscussions)
  if (denied) return { data: null, error: denied }
  const result = await discussions.listDiscussions(
    scope.organizationId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: {
      items: result.data.items
        .filter((item) => item.clientVisible)
        .map(serializePortalDiscussion),
      hasMore: result.data.hasMore,
    },
    error: null,
  }
}

export async function retrieveDiscussion(
  scope: PortalScope,
  discussionId: string
): Promise<
  ServiceResult<{ discussion: PortalDiscussion; posts: PortalDiscussionPost[] }>
> {
  const denied = flagError(scope.grant.allowDiscussions)
  if (denied) return { data: null, error: denied }
  const result = await discussions.retrieveDiscussion(
    scope.organizationId,
    scope.projectId,
    discussionId
  )
  if (result.error) return { data: null, error: result.error }
  if (!result.data.clientVisible)
    return { data: null, error: getError('projects/discussion-not-found') }
  const posts = await discussions.listPosts(
    scope.organizationId,
    scope.projectId,
    result.data.id,
    {}
  )
  if (posts.error) return { data: null, error: posts.error }
  return {
    data: {
      discussion: serializePortalDiscussion(result.data),
      posts: posts.data.items.map(serializePortalDiscussionPost),
    },
    error: null,
  }
}

export async function listWikiPages(
  scope: PortalScope,
  query: PortalListQuery
): Promise<ServiceResult<{ items: PortalWikiPage[]; hasMore: boolean }>> {
  const denied = flagError(scope.grant.allowWiki)
  if (denied) return { data: null, error: denied }
  const result = await wiki.listPages(
    scope.organizationId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: {
      items: result.data.items.map(serializePortalWikiPage),
      hasMore: result.data.hasMore,
    },
    error: null,
  }
}

export async function retrieveWikiPage(
  scope: PortalScope,
  pageRef: string
): Promise<ServiceResult<PortalWikiPage>> {
  const denied = flagError(scope.grant.allowWiki)
  if (denied) return { data: null, error: denied }
  const result = await wiki.retrievePage(
    scope.organizationId,
    scope.projectId,
    pageRef
  )
  if (result.error) return { data: null, error: result.error }
  return { data: serializePortalWikiPage(result.data), error: null }
}

export async function listAttachments(
  scope: PortalScope,
  query: PortalListQuery
): Promise<ServiceResult<{ items: PortalAttachment[]; hasMore: boolean }>> {
  const denied = flagError(scope.grant.allowFiles)
  if (denied) return { data: null, error: denied }
  const result = await attachments.listAttachmentLinks(
    scope.organizationId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  const visible = result.data.items.filter((item) => item.clientVisible)
  return {
    data: {
      items: visible.map((item) =>
        serializePortalAttachment({
          id: item.id,
          tenantId: item.tenantId,
          projectId: item.projectId,
          issueId: item.issueId,
          milestoneId: item.milestoneId,
          url: item.url,
          name: item.name,
          clientVisible: item.clientVisible,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })
      ),
      hasMore: result.data.hasMore,
    },
    error: null,
  }
}

async function visibleSubjectIds(scope: PortalScope): Promise<{
  issueIds: Set<string>
  milestoneIds: Set<string>
}> {
  const issueIds = new Set<string>()
  const milestoneIds = new Set<string>()
  let startingAfter: string | undefined
  for (;;) {
    const page = await issues.listVisibleIssues(
      scope.organizationId,
      scope.projectId,
      { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }
    )
    if (page.error || !page.data) break
    for (const item of page.data.items) issueIds.add(item.id)
    if (!page.data.hasMore) break
    startingAfter = page.data.items[page.data.items.length - 1]?.id
    if (!startingAfter) break
  }
  const milestones = await workStructure.listVisibleMilestones(
    scope.organizationId,
    scope.projectId,
    { limit: 100 }
  )
  if (!milestones.error && milestones.data)
    for (const milestone of milestones.data) milestoneIds.add(milestone.id)
  return { issueIds, milestoneIds }
}

export async function listActivity(
  scope: PortalScope,
  query: PortalActivityQuery
): Promise<
  ServiceResult<{
    items: PortalActivityItem[]
    nextCursor: string | null
    hasMore: boolean
  }>
> {
  const subjects = await visibleSubjectIds(scope)
  const result = await collaboration.listActivityForScope(
    scope.tenantId,
    scope.projectId,
    query
  )
  if (result.error) return { data: null, error: result.error }
  const items: PortalActivityItem[] = []
  for (const item of result.data.items) {
    if (item.kind === 'issue-event' && !subjects.issueIds.has(item.subjectId))
      continue
    if (
      item.kind === 'milestone-event' &&
      !subjects.milestoneIds.has(item.subjectId)
    )
      continue
    if (item.kind !== 'issue-event' && item.kind !== 'milestone-event')
      continue
    items.push({
      object: 'portal.activity-item',
      id: item.id,
      kind: item.kind,
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      type: item.type,
      createdAt: item.createdAt,
    })
  }
  return {
    data: {
      items,
      nextCursor: result.data.nextCursor,
      hasMore: result.data.hasMore,
    },
    error: null,
  }
}

export async function getTimeByPhase(
  scope: PortalScope
): Promise<ServiceResult<PortalPhaseHours[]>> {
  const denied = flagError(scope.grant.allowTime)
  if (denied) return { data: null, error: denied }
  const entries = await time.listTimeEntries(scope.organizationId, {
    projectId: scope.projectId,
  })
  if (entries.error) return { data: null, error: entries.error }
  const milestones = await workStructure.listVisibleMilestones(
    scope.organizationId,
    scope.projectId,
    { limit: 100 }
  )
  const names = new Map<string, string>()
  if (!milestones.error && milestones.data)
    for (const milestone of milestones.data) names.set(milestone.id, milestone.name)

  const minutesByPhase = new Map<string | null, number>()
  for (const entry of entries.data) {
    if (entry.durationMinutes === null || entry.durationMinutes === undefined)
      continue
    const key = entry.milestoneId ?? null
    minutesByPhase.set(key, (minutesByPhase.get(key) ?? 0) + entry.durationMinutes)
  }
  const phases: PortalPhaseHours[] = []
  for (const [milestoneId, minutes] of minutesByPhase) {
    phases.push({
      object: 'portal.phase-hours',
      milestoneId,
      milestoneName: milestoneId ? (names.get(milestoneId) ?? null) : null,
      hours: toHours(minutes),
    })
  }
  phases.sort((left, right) => right.hours - left.hours)
  return { data: phases, error: null }
}

export async function listInvoices(
  scope: PortalScope
): Promise<ServiceResult<PortalInvoice[]>> {
  const denied = flagError(scope.grant.allowInvoices)
  if (denied) return { data: null, error: denied }
  const result = await finance.listBilledInvoices(
    scope.organizationId,
    scope.projectId
  )
  if (result.error) return { data: null, error: result.error }
  return {
    data: result.data.map((invoice) => ({
      object: 'portal.invoice' as const,
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      billedHours: toHours(invoice.billedMinutes),
      entryCount: invoice.entryCount,
    })),
    error: null,
  }
}

function revokedGrantError(scope: PortalScope): ProjectsError | null {
  if (scope.grant.revokedAt !== null)
    return getError('projects/client-grant-not-found')
  if (scope.grant.projectId !== scope.projectId)
    return getError('projects/client-grant-not-found')
  if (scope.grant.userId !== scope.portalUserId)
    return getError('projects/client-grant-not-found')
  if (scope.grant.tenantId !== scope.tenantId)
    return getError('projects/client-grant-not-found')
  return null
}

export async function createIssueComment(
  scope: PortalScope,
  issueRef: string,
  body: { body: string }
): Promise<ServiceResult<PortalComment>> {
  const revoked = revokedGrantError(scope)
  if (revoked) return { data: null, error: revoked }
  const denied = flagError(scope.grant.allowComments)
  if (denied) return { data: null, error: denied }
  const issue = await issues.retrieveVisibleIssue(
    scope.organizationId,
    scope.projectId,
    issueRef
  )
  if (issue.error) return { data: null, error: issue.error }
  const created = await comments.create(
    scope.organizationId,
    issue.data.identifier,
    { body: body.body, authorUserId: scope.portalUserId }
  )
  if (created.error) return { data: null, error: created.error }
  const visibility = await comments.setCommentVisibility(
    scope.organizationId,
    issue.data.identifier,
    created.data.id,
    true
  )
  if (visibility.error) return { data: null, error: visibility.error }
  return {
    data: serializePortalComment({
      id: created.data.id,
      issueId: created.data.issueId,
      authorUserId: created.data.authorUserId,
      body: created.data.body,
      createdAt: created.data.createdAt,
      updatedAt: created.data.updatedAt,
    }),
    error: null,
  }
}

export async function createMilestoneComment(
  scope: PortalScope,
  milestoneId: string,
  body: { body: string }
): Promise<ServiceResult<PortalMilestoneComment>> {
  const revoked = revokedGrantError(scope)
  if (revoked) return { data: null, error: revoked }
  const denied = flagError(scope.grant.allowComments)
  if (denied) return { data: null, error: denied }
  const milestone = await workStructure.retrieveVisibleMilestone(
    scope.organizationId,
    scope.projectId,
    milestoneId
  )
  if (milestone.error) return { data: null, error: milestone.error }
  const created = await milestoneDetails.createComment(
    scope.organizationId,
    milestone.data.id,
    { body: body.body, authorUserId: scope.portalUserId }
  )
  if (created.error) return { data: null, error: created.error }
  const visibility = await milestoneDetails.setMilestoneCommentVisibility(
    scope.organizationId,
    milestone.data.id,
    created.data.id,
    true
  )
  if (visibility.error) return { data: null, error: visibility.error }
  return {
    data: serializePortalMilestoneComment({
      id: created.data.id,
      milestoneId: created.data.milestoneId,
      authorUserId: created.data.authorUserId,
      body: created.data.body,
      createdAt: created.data.createdAt,
      updatedAt: created.data.updatedAt,
    }),
    error: null,
  }
}

export async function createDiscussionPost(
  scope: PortalScope,
  discussionId: string,
  body: { body: string }
): Promise<ServiceResult<PortalDiscussionPost>> {
  const revoked = revokedGrantError(scope)
  if (revoked) return { data: null, error: revoked }
  const denied = flagError(scope.grant.allowDiscussions)
  if (denied) return { data: null, error: denied }
  const existing = await discussions.retrieveDiscussion(
    scope.organizationId,
    scope.projectId,
    discussionId
  )
  if (existing.error) return { data: null, error: existing.error }
  if (!existing.data.clientVisible)
    return { data: null, error: getError('projects/discussion-not-found') }
  if (existing.data.locked)
    return { data: null, error: getError('projects/discussion-locked') }
  const created = await discussions.createPost(
    scope.organizationId,
    scope.projectId,
    existing.data.id,
    { body: body.body, authorUserId: scope.portalUserId }
  )
  if (created.error) return { data: null, error: created.error }
  return { data: serializePortalDiscussionPost(created.data), error: null }
}
