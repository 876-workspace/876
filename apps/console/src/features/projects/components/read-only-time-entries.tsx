'use client'

import {
  TimeEntryList,
  type TimeEntryListRow,
} from '@876/projects-ui/time-entry-list'

/**
 * The operator time-entry table. `TimeEntryList` renders no action controls
 * when `canEdit` is false, and the required callbacks stay local no-ops so no
 * function crosses the RSC boundary.
 */
export function ReadOnlyTimeEntries({
  entries,
  issuesBaseHref,
  emptyTitle,
}: {
  entries: readonly TimeEntryListRow[]
  issuesBaseHref: string
  emptyTitle: string
}) {
  return (
    <TimeEntryList
      entries={entries}
      issuesBaseHref={issuesBaseHref}
      canEdit={false}
      onEdit={() => {}}
      onDelete={() => {}}
      emptyTitle={emptyTitle}
    />
  )
}
