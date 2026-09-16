export type ActivityItem = {
  object: 'projects.activity'
  id: string
  kind: string
  subjectType: 'project' | 'phase' | 'work-item' | 'timesheet' | 'automation-run' | 'discussion' | 'wiki-page'
  subjectId: string
  subjectLabel: string
  actorLabel: string | null
  summary: string
  createdAt: number
}

export type Discussion = {
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

export type DiscussionPost = {
  object: 'projects.discussion-post'
  id: string
  authorLabel: string
  bodyMarkdown: string
  editedAt: number | null
  createdAt: number
}

export type WikiPage = {
  object: 'projects.wiki-page'
  id: string
  projectId: string
  slug: string
  title: string
  parentId: string | null
  currentRevision: number
  updatedAt: number
}

export type WikiRevision = {
  object: 'projects.wiki-revision'
  id: string
  pageId: string
  revision: number
  authorLabel: string
  bodyMarkdown: string
  createdAt: number
}

export type ClientGrant = {
  object: 'projects.client-grant'
  id: string
  projectId: string
  userLabel: string
  invitedAt: number
  revokedAt: number | null
}
