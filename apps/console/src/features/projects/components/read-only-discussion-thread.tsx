import { Badge } from '@876/ui/badge'
import { Markdown } from '@876/ui/markdown'

import { formatDay } from '@876/projects-ui/finance/format-money'
import { ClientVisibleBadge } from '@876/projects-ui/collaboration/client-visible-badge'
import type {
  Discussion,
  DiscussionPost,
} from '@876/projects-ui/collaboration/types'

/**
 * Read-only Console variant of the shared `DiscussionThread`.
 *
 * The shared thread requires a `replyAction` form target, which Console never
 * provides (operator surface is read-only). This renders the same header and
 * post list without the reply form, so no mutation affordance is reachable.
 */
export function ReadOnlyDiscussionThread({
  discussion,
  posts,
}: {
  discussion: Discussion
  posts: readonly DiscussionPost[]
}) {
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
    </section>
  )
}
