import { formatDay } from '@876/projects-ui/finance/format-money'
import type { WikiRevision } from '@876/projects-ui/collaboration/types'

/**
 * Read-only Console variant of the shared `WikiRevisionList`.
 *
 * The shared list requires a `restoreActionBase` form target, which Console
 * never provides (operator surface is read-only). This renders the same
 * revision rows without restore forms.
 */
export function ReadOnlyWikiRevisionList({
  revisions,
}: {
  revisions: readonly WikiRevision[]
}) {
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
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {revision.authorLabel} · {formatDay(revision.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
