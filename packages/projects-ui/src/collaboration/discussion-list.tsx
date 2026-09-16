import { Badge } from '@876/ui/badge'
import Link from 'next/link'

import { formatDay } from '../finance/format-money'
import { ClientVisibleBadge } from './client-visible-badge'
import type { Discussion } from './types'

type DiscussionListProps = {
  discussions: readonly Discussion[]
  hrefBase: string
}

export function DiscussionList({ discussions, hrefBase }: DiscussionListProps) {
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
              {discussion.postCount} {discussion.postCount === 1 ? 'post' : 'posts'}
            </span>
            <span>Created {formatDay(discussion.createdAt)}</span>
            {discussion.lastPostAt !== null ? (
              <span>Last post {formatDay(discussion.lastPostAt)}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
