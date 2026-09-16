import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import type { SerializedDiscussion } from '../discussions/discussions.serializers.js'
import type { SerializedDiscussionPost } from '../discussions/discussions.serializers.js'
import type { SerializedWikiPage } from '../wiki/wiki.serializers.js'
import type { IssueRow } from '../issues/issues.serializers.js'
import type { MilestoneRow } from '../work-structure/work-structure.serializers.js'
import type { AttachmentLinkRow } from './attachment-links.serializers.js'

export type PortalIssue = {
  object: 'portal.issue'
  id: string
  projectId: string
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  milestoneId: string | null
  createdAt: number
  updatedAt: number
}

export type PortalMilestone = {
  object: 'portal.milestone'
  id: string
  projectId: string
  key: string
  name: string
  description: string | null
  status: string
  startDate: number | null
  targetDate: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export type PortalComment = {
  object: 'portal.comment'
  id: string
  issueId: string
  authorUserId: string | null
  body: string
  createdAt: number
  updatedAt: number
}

export type PortalMilestoneComment = {
  object: 'portal.milestone-comment'
  id: string
  milestoneId: string
  authorUserId: string | null
  body: string
  createdAt: number
  updatedAt: number
}

export type PortalDiscussion = {
  object: 'portal.discussion'
  id: string
  projectId: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type PortalDiscussionPost = {
  object: 'portal.discussion-post'
  id: string
  discussionId: string
  authorUserId: string | null
  body: string
  createdAt: number
  updatedAt: number
}

export type PortalWikiPage = {
  object: 'portal.wiki-page'
  id: string
  projectId: string
  slug: string
  title: string
  body: string
  parentPageId: string | null
  updatedAt: number
}

export type PortalAttachment = {
  object: 'portal.attachment'
  id: string
  issueId: string | null
  milestoneId: string | null
  url: string
  name: string | null
  createdAt: number
}

export type PortalActivityItem = {
  object: 'portal.activity-item'
  id: string
  kind: string
  subjectType: string
  subjectId: string
  type: string
  createdAt: number
}

export type PortalPhaseHours = {
  object: 'portal.phase-hours'
  milestoneId: string | null
  milestoneName: string | null
  hours: number
}

export type PortalInvoice = {
  object: 'portal.invoice'
  invoiceId: string
  status: string
  billedHours: number
  entryCount: number
}

export function serializePortalIssue(row: IssueRow): PortalIssue {
  return {
    object: 'portal.issue',
    id: row.id,
    projectId: row.projectId,
    identifier: row.identifier,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    milestoneId: row.milestoneId ?? null,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializePortalMilestone(row: MilestoneRow): PortalMilestone {
  return {
    object: 'portal.milestone',
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: nullableFromDbUnixSeconds(row.startDate),
    targetDate: nullableFromDbUnixSeconds(row.targetDate),
    completedAt: nullableFromDbUnixSeconds(row.completedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export type PortalCommentSource = {
  id: string
  issueId: string
  authorUserId: string | null
  body: string
  createdAt: bigint | number
  updatedAt: bigint | number
}

export function serializePortalComment(row: PortalCommentSource): PortalComment {
  return {
    object: 'portal.comment',
    id: row.id,
    issueId: row.issueId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export type PortalMilestoneCommentSource = {
  id: string
  milestoneId: string
  authorUserId: string | null
  body: string
  createdAt: bigint | number
  updatedAt: bigint | number
}

export function serializePortalMilestoneComment(
  row: PortalMilestoneCommentSource
): PortalMilestoneComment {
  return {
    object: 'portal.milestone-comment',
    id: row.id,
    milestoneId: row.milestoneId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializePortalDiscussion(
  row: SerializedDiscussion
): PortalDiscussion {
  return {
    object: 'portal.discussion',
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializePortalDiscussionPost(
  row: SerializedDiscussionPost
): PortalDiscussionPost {
  return {
    object: 'portal.discussion-post',
    id: row.id,
    discussionId: row.discussionId,
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializePortalWikiPage(
  row: SerializedWikiPage
): PortalWikiPage {
  return {
    object: 'portal.wiki-page',
    id: row.id,
    projectId: row.projectId,
    slug: row.slug,
    title: row.title,
    body: row.body,
    parentPageId: row.parentPageId,
    updatedAt: row.updatedAt,
  }
}

export function serializePortalAttachment(
  row: AttachmentLinkRow
): PortalAttachment {
  return {
    object: 'portal.attachment',
    id: row.id,
    issueId: row.issueId,
    milestoneId: row.milestoneId,
    url: row.url,
    name: row.name,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}
