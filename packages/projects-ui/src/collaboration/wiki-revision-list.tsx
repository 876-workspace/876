import { Button } from '@876/ui/button'

import { formatDay } from '../finance/format-money'
import type { WikiRevision } from './types'

export type WikiRevisionListProps = {
  revisions: readonly WikiRevision[]
  restoreActionBase: string
}

export function WikiRevisionList({
  revisions,
  restoreActionBase,
}: WikiRevisionListProps) {
  if (revisions.length === 0) {
    return (
      <p
        data-slot="wiki-revision-list-empty"
        className="text-muted-foreground py-12 text-center text-sm"
      >
        No revisions yet
      </p>
    )
  }

  return (
    <ul data-slot="wiki-revision-list" className="flex flex-col gap-2">
      {revisions.map((revision) => (
        <li
          key={revision.id}
          data-slot="wiki-revision-list-item"
          className="rounded-md border px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              Revision {revision.revision}
            </span>
            <form
              action={`${restoreActionBase.replace(/\/$/, '')}/${encodeURIComponent(revision.id)}`}
              method="post"
            >
              <Button type="submit" variant="outline">
                Restore revision {revision.revision}
              </Button>
            </form>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {revision.authorLabel} · {formatDay(revision.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
