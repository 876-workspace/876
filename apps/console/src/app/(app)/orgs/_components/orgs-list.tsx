'use client'

import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Building2 } from '@876/ui/icons'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { OrgTable } from './org-table'

type Props = {
  orgs: AdminOrganization[]
  subscriptionsMap: Record<string, AdminSubscription[]>
  isSearching: boolean
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

export function OrgsList({
  orgs,
  subscriptionsMap,
  isSearching,
  hasMore,
  firstId,
  lastId,
}: Props) {
  return (
    <>
      <TrackMCEventOnMount event={AnalyticsEvent.OrgListViewed} />
      {orgs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>
              {isSearching ? 'No results' : 'No organizations'}
            </EmptyTitle>
            <EmptyDescription>
              {isSearching
                ? 'No organizations matched this search.'
                : 'No organizations found.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <OrgTable
          data={orgs}
          subscriptionsMap={subscriptionsMap}
          isSearching={isSearching}
          hasMore={hasMore}
          firstId={firstId}
          lastId={lastId}
        />
      )}
    </>
  )
}
