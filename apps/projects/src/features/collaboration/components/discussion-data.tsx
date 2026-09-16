import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import {
  mapDiscussion,
  mapDiscussionPost,
} from '../mappers'
import { DiscussionControls, DiscussionReplyForm, DiscussionThreadView, NewDiscussionForm } from './discussion-forms'
import { DiscussionList } from './discussion-list'
import type { MentionMember } from './mention-input'

async function loadMembers(orgId: string): Promise<readonly MentionMember[]> {
  const members = await loadMemberLabels(orgId)
  return Object.entries(members.labels).map(([userId, label]) => ({
    userId,
    label,
  }))
}

export async function ProjectDiscussionsData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const [discussionsResult, members] = await Promise.all([
    projects.discussions.list(orgId, projectId, { limit: 100 }),
    loadMembers(orgId),
  ])
  if (discussionsResult.error || !discussionsResult.data)
    return (
      <AppError
        title="Discussions could not be loaded"
        error={
          discussionsResult.error ?? {
            code: 'projects/discussions-unavailable',
            message: 'Discussions could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const sorted = [...discussionsResult.data.data].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt - a.createdAt
  })

  return (
    <div className="space-y-6">
      <NewDiscussionForm projectId={projectId} members={members} />
      <DiscussionList
        discussions={sorted.map(mapDiscussion)}
        hrefBase={`/projects/${encodeURIComponent(projectId)}/discussions`}
      />
    </div>
  )
}

export async function DiscussionThreadData({
  orgId,
  projectId,
  discussionId,
  canEdit,
}: {
  orgId: string
  projectId: string
  discussionId: string
  canEdit: boolean
}) {
  const [discussionResult, postsResult, membersResult] = await Promise.all([
    projects.discussions.retrieve(orgId, projectId, discussionId),
    projects.discussions.listPosts(orgId, projectId, discussionId, {
      limit: 100,
    }),
    loadMemberLabels(orgId),
  ])
  if (discussionResult.error?.code === 'projects/discussion-not-found')
    notFound()
  if (discussionResult.error || !discussionResult.data)
    return (
      <AppError
        title="The discussion could not be loaded"
        error={
          discussionResult.error ?? {
            code: 'projects/discussion-unavailable',
            message: 'The discussion could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const discussion = mapDiscussion(discussionResult.data)
  const members: MentionMember[] = Object.entries(membersResult.labels).map(
    ([userId, label]) => ({ userId, label })
  )
  const posts = (postsResult.data?.data ?? []).map((post) =>
    mapDiscussionPost(post, membersResult.labels)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{discussion.title}</h1>
        {discussionResult.data.body ? (
          <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
            {discussionResult.data.body}
          </p>
        ) : null}
      </div>
      {canEdit ? (
        <DiscussionControls projectId={projectId} discussion={discussion} />
      ) : null}
      <DiscussionThreadView discussion={discussion} posts={posts} />
      <DiscussionReplyForm
        projectId={projectId}
        discussionId={discussion.id}
        locked={discussion.locked}
        members={members}
      />
    </div>
  )
}
