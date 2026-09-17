import type {
  UiActivityItem,
  UiClientGrant,
  UiDiscussion,
  UiDiscussionPost,
  UiWikiPage,
  UiWikiRevision,
} from '@/types/collaboration'
import type {
  ActivityItem as ServiceActivityItem,
  ClientGrant as ServiceClientGrant,
  Discussion as ServiceDiscussion,
  DiscussionPost as ServiceDiscussionPost,
  WikiPage as ServiceWikiPage,
  WikiRevision as ServiceWikiRevision,
} from '@876/projects'

const KNOWN_ACTIVITY_SUBJECTS = [
  'project',
  'phase',
  'work-item',
  'timesheet',
  'automation-run',
  'discussion',
  'wiki-page',
] as const

function toSubjectType(value: string): UiActivityItem['subjectType'] {
  return (KNOWN_ACTIVITY_SUBJECTS as readonly string[]).includes(value)
    ? (value as UiActivityItem['subjectType'])
    : 'project'
}

function humanizeActivityType(type: string): string {
  return type
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => (part[0]?.toUpperCase() ?? '') + part.slice(1))
    .join(' ')
}

function summarizeActivity(item: ServiceActivityItem): string {
  const action = humanizeActivityType(item.type)
  if (item.fromValue !== null && item.toValue !== null)
    return `${action}: ${item.fromValue} → ${item.toValue}`
  if (item.toValue !== null) return `${action}: ${item.toValue}`
  return action
}

export function mapActivityItem(
  item: ServiceActivityItem,
  labels: Readonly<Record<string, string>>
): UiActivityItem {
  return {
    object: 'projects.activity',
    id: item.id,
    kind: item.kind,
    subjectType: toSubjectType(item.subjectType),
    subjectId: item.subjectId,
    subjectLabel: item.subjectId,
    actorLabel:
      item.actorUserId === null
        ? null
        : (labels[item.actorUserId] ?? item.actorUserId),
    summary: summarizeActivity(item),
    createdAt: item.createdAt,
  }
}

export function mapDiscussion(discussion: ServiceDiscussion): UiDiscussion {
  return {
    object: 'projects.discussion',
    id: discussion.id,
    projectId: discussion.projectId,
    title: discussion.title,
    pinned: discussion.pinned,
    locked: discussion.locked,
    clientVisible: discussion.clientVisible,
    postCount: discussion.postCount,
    lastPostAt: null,
    createdAt: discussion.createdAt,
  }
}

export function mapDiscussionPost(
  post: ServiceDiscussionPost,
  labels: Readonly<Record<string, string>>
): UiDiscussionPost {
  return {
    object: 'projects.discussion-post',
    id: post.id,
    authorLabel:
      post.authorUserId === null
        ? 'Unknown'
        : (labels[post.authorUserId] ?? post.authorUserId),
    bodyMarkdown: post.body,
    editedAt: post.editCount > 0 ? post.updatedAt : null,
    createdAt: post.createdAt,
  }
}

export function mapWikiPage(page: ServiceWikiPage): UiWikiPage {
  return {
    object: 'projects.wiki-page',
    id: page.id,
    projectId: page.projectId,
    slug: page.slug,
    title: page.title,
    parentId: page.parentPageId,
    currentRevision: page.revisionCount,
    updatedAt: page.updatedAt,
  }
}

export function mapWikiRevision(
  revision: ServiceWikiRevision,
  position: { index: number; total: number },
  labels: Readonly<Record<string, string>>
): UiWikiRevision {
  return {
    object: 'projects.wiki-revision',
    id: revision.id,
    pageId: revision.pageId,
    revision: Math.max(1, position.total - position.index),
    authorLabel:
      revision.authorUserId === null
        ? 'Unknown'
        : (labels[revision.authorUserId] ?? revision.authorUserId),
    bodyMarkdown: revision.body,
    createdAt: revision.createdAt,
  }
}

export function mapClientGrant(
  grant: ServiceClientGrant,
  labels: Readonly<Record<string, string>>
): UiClientGrant {
  return {
    object: 'projects.client-grant',
    id: grant.id,
    projectId: grant.projectId,
    userLabel: labels[grant.userId] ?? grant.userId,
    invitedAt: grant.createdAt,
    revokedAt: grant.revokedAt,
  }
}
