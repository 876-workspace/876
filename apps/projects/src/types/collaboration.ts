export type UiActivityItem = {
  object: 'projects.activity'
  id: string
  kind: string
  subjectType:
    | 'project'
    | 'phase'
    | 'work-item'
    | 'timesheet'
    | 'automation-run'
    | 'discussion'
    | 'wiki-page'
  subjectId: string
  subjectLabel: string
  actorLabel: string | null
  summary: string
  createdAt: number
}

export type UiDiscussion = {
  object: 'projects.discussion'
  id: string
  projectId: string
  title: string
  pinned: boolean
  locked: boolean
  clientVisible: boolean
  postCount: number
  lastPostAt: number | null
  createdAt: number
}

export type UiDiscussionPost = {
  object: 'projects.discussion-post'
  id: string
  authorLabel: string
  bodyMarkdown: string
  editedAt: number | null
  createdAt: number
}

export type UiWikiPage = {
  object: 'projects.wiki-page'
  id: string
  projectId: string
  slug: string
  title: string
  parentId: string | null
  currentRevision: number
  updatedAt: number
}

export type UiWikiRevision = {
  object: 'projects.wiki-revision'
  id: string
  pageId: string
  revision: number
  authorLabel: string
  bodyMarkdown: string
  createdAt: number
}

export type UiClientGrant = {
  object: 'projects.client-grant'
  id: string
  projectId: string
  userLabel: string
  invitedAt: number
  revokedAt: number | null
}

export type FollowSubjectType = 'project' | 'phase' | 'work-item'

export type { ActivityFeed, DiscussionPost, WikiRevision } from '@876/projects'

export type MentionMember = {
  userId: string
  label: string
}

export type WikiPageOption = {
  id: string
  title: string
}
