'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Markdown } from '@876/ui/markdown'
import { Textarea } from '@876/ui/textarea'
import { useId } from 'react'

import { formatDay } from '../finance/format-money'
import { ClientVisibleBadge } from './client-visible-badge'
import type { Discussion, DiscussionPost } from './types'

type DiscussionThreadProps = {
  discussion: Discussion
  posts: readonly DiscussionPost[]
  replyAction: string
}

export function DiscussionThread({
  discussion,
  posts,
  replyAction,
}: DiscussionThreadProps) {
  const replyId = useId()

  return (
    <section data-slot="discussion-thread" className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{discussion.title}</h2>
        {discussion.pinned ? <Badge variant="outline">Pinned</Badge> : null}
        {discussion.locked ? <Badge variant="outline">Locked</Badge> : null}
        <ClientVisibleBadge clientVisible={discussion.clientVisible} />
      </header>
      {posts.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No posts yet
        </p>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="rounded-md border px-4 py-3">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium">{post.authorLabel}</span>
              <span>Posted {formatDay(post.createdAt)}</span>
              {post.editedAt !== null ? (
                <span>Edited {formatDay(post.editedAt)}</span>
              ) : null}
            </div>
            <Markdown content={post.bodyMarkdown} />
          </article>
        ))
      )}
      <form action={replyAction} method="post" className="space-y-3">
        <label htmlFor={replyId} className="text-sm font-medium">
          Reply
        </label>
        <Textarea
          id={replyId}
          name="bodyMarkdown"
          required
          disabled={discussion.locked}
          rows={4}
        />
        {discussion.locked ? (
          <p className="text-muted-foreground text-sm">
            This discussion is locked.
          </p>
        ) : null}
        <Button type="submit" disabled={discussion.locked}>
          Reply
        </Button>
      </form>
    </section>
  )
}
