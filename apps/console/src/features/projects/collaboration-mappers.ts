import type {
  ActivityItem as ServiceActivityItem,
  ClientGrant as ServiceClientGrant,
  Discussion as ServiceDiscussion,
  DiscussionPost as ServiceDiscussionPost,
  WikiPage as ServiceWikiPage,
  WikiRevision as ServiceWikiRevision,
} from '@876/projects'
import type {
  ActivityItem as UiActivityItem,
  ClientGrant as UiClientGrant,
  Discussion as UiDiscussion,
  DiscussionPost as UiDiscussionPost,
  WikiPage as UiWikiPage,
  WikiRevision as UiWikiRevision,
} from '@876/projects-ui/collaboration/types'

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

function humanizeActivityType(value: string): string {
  return value
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

export function toUiActivityItem(
  item: ServiceActivityItem,
): UiActivityItem {
  return {
    object: 'projects.activity',
    id: item.id,
    kind: item.kind,
    subjectType: toSubjectType(item.subjectType),
    subjectId: item.subjectId,
    subjectLabel: item.subjectId,
    actorLabel: item.actorUserId,
    summary: summarizeActivity(item),
    createdAt: item.createdAt,
  }
}

export function toUiDiscussion(
  discussion: ServiceDiscussion,
): UiDiscussion {
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

export function toUiDiscussionPost(
  post: ServiceDiscussionPost,
): UiDiscussionPost {
  return {
    object: 'projects.discussion-post',
    id: post.id,
    authorLabel: post.authorUserId ?? 'Unknown',
    bodyMarkdown: post.body,
    editedAt: post.editCount > 0 ? post.updatedAt : null,
    createdAt: post.createdAt,
  }
}

export function toUiWikiPage(page: ServiceWikiPage): UiWikiPage {
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

export function toUiWikiRevision(
  revision: ServiceWikiRevision,
  position: { index: number; total: number },
): UiWikiRevision {
  return {
    object: 'projects.wiki-revision',
    id: revision.id,
    pageId: revision.pageId,
    revision: Math.max(1, position.total - position.index),
    authorLabel: revision.authorUserId ?? 'Unknown',
    bodyMarkdown: revision.body,
    createdAt: revision.createdAt,
  }
}

export function toUiClientGrant(
  grant: ServiceClientGrant,
): UiClientGrant {
  return {
    object: 'projects.client-grant',
    id: grant.id,
    projectId: grant.projectId,
    userLabel: grant.userId,
    invitedAt: grant.createdAt,
    revokedAt: grant.revokedAt,
  }
}
