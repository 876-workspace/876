import { Suspense, type ReactNode } from 'react'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { loadTeamListData } from '@/lib/access/team-list-data'
import { TeamList } from './_components/team-list'
import { TeamListSkeleton } from './_components/team-list-skeleton'
import type { TeamMemberRow } from './_components/team-member-row'
import { TeamShell } from './_components/team-shell'

/**
 * Owns the toolbar and the member list for every route under `/settings/users`.
 *
 * Keeping them in the layout — rather than in each page — is what lets a tab
 * navigation re-render only the tab body, and what keeps the list column a
 * single element across open/close so its width can animate.
 */
export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <TeamShell
      list={
        <Suspense fallback={<TeamListSkeleton />}>
          <TeamListData />
        </Suspense>
      }
    >
      <TrackMCEventOnMount event={AnalyticsEvent.TeamListViewed} />
      {children}
    </TeamShell>
  )
}

/**
 * Data half of the list column. Rendered inside a Suspense boundary so the
 * toolbar is interactive before the access grants resolve.
 */
async function TeamListData() {
  const { rows, staffPositionsUnavailable } = await loadTeamListData()
  const members: TeamMemberRow[] = rows

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {staffPositionsUnavailable ? (
        <div
          role="status"
          className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-[0.8125rem]"
        >
          Staff positions are temporarily unavailable. Access grants and other
          Team details are still current.
        </div>
      ) : null}
      <TeamList members={members} />
    </div>
  )
}
