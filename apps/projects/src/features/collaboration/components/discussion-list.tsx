import { Badge } from '@876/ui/badge'
import Link from 'next/link'

import { ClientVisibleBadge } from './client-visible-badge'
import type { UiDiscussion } from '@/types/collaboration'

export function DiscussionList({
  discussions,
  hrefBase,
}: {
  discussions: readonly UiDiscussion[]
  hrefBase: string
}) {
  if (discussions.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No discussions yet
      </p>
    )
  }

  return (
    <ul data-slot="discussion-list" className="flex flex-col gap-2">
      {discussions.map((discussion) => (
        <li key={discussion.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${hrefBase.replace(/\/+$/, '')}/${encodeURIComponent(discussion.id)}`}
              className="text-sm font-medium hover:underline"
            >
              {discussion.title}
            </Link>
            {discussion.pinned ? <Badge variant="outline">Pinned</Badge> : null}
            {discussion.locked ? <Badge variant="outline">Locked</Badge> : null}
            <ClientVisibleBadge clientVisible={discussion.clientVisible} />
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-xs">
            <span>
              {discussion.postCount}{' '}
              {discussion.postCount === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
