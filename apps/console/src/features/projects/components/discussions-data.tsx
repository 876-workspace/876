import { DiscussionList } from '@876/projects-ui/collaboration/discussion-list'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { toUiDiscussion, toUiDiscussionPost } from '../collaboration-mappers'
import { projects } from '@/lib/services/projects'

import { ReadOnlyDiscussionThread } from './read-only-discussion-thread'

/**
 * The data half of the project Discussions tab, shared by every host.
 * Read-only: pinned threads first, then newest. No create affordance.
 */
export async function ProjectDiscussionsData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
}) {
  const [projectResult, discussionsResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.discussions.list(organizationId, projectId, { limit: 100 }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (discussionsResult.error || !discussionsResult.data) {
    return (
      <AppError
        title="Discussions could not be loaded"
        error={discussionsResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const sorted = [...discussionsResult.data.data].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt - a.createdAt
  })

  return (
    <DiscussionList
      discussions={sorted.map(toUiDiscussion)}
      hrefBase={`${base}/projects/${encodeURIComponent(projectId)}/discussions`}
    />
  )
}

/**
 * The data half of the discussion thread record, shared by every host.
 * Read-only: the thread header and its posts without the reply form. The
 * shared `DiscussionThread` requires a `replyAction`, so Console renders the
 * local `ReadOnlyDiscussionThread` instead.
 */
export async function DiscussionThreadData({
  organizationId,
  projectId,
  discussionId,
}: {
  organizationId: string
  projectId: string
  discussionId: string
}) {
  const [projectResult, discussionResult, postsResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.discussions.retrieve(
      organizationId,
      projectId,
      decodeURIComponent(discussionId),
    ),
    projects.discussions.listPosts(
      organizationId,
      projectId,
      decodeURIComponent(discussionId),
      { limit: 100 },
    ),
  ])

  if (
    projectResult.error?.code === 'projects/project-not-found' ||
    discussionResult.error?.code === 'projects/discussion-not-found'
  )
    notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  if (discussionResult.error || !discussionResult.data) {
    return (
      <AppError
        title="Discussion could not be loaded"
        error={discussionResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const discussion = toUiDiscussion(discussionResult.data)
  const posts = (postsResult.data?.data ?? []).map(toUiDiscussionPost)

  return (
    <div className="space-y-3">
      {postsResult.error ? (
        <AppError
          title="Some discussion posts could not be loaded"
          error={postsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ReadOnlyDiscussionThread discussion={discussion} posts={posts} />
    </div>
  )
}
