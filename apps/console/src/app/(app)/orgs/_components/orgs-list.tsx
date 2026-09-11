'use client'

import { useSearchParams } from 'next/navigation'
import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Building2 } from '@876/ui/icons'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { cn } from '@876/core/utils'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { statusBadgeClass } from '@/lib/format'
import { OrgTable } from './org-table'

type Props = {
  orgs: AdminOrganization[]
  subscriptionsMap: Record<string, AdminSubscription[]>
  isSearching: boolean
  hasMore: boolean
  firstId: string | null
  lastId: string | null
}

/**
 * The list column in both of its forms: the full-width table when no
 * organization is open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width. The query-aware parallel route owns
 * server-side status/search filtering and pagination.
 */
export function OrgsList({
  orgs,
  subscriptionsMap,
  isSearching,
  hasMore,
  firstId,
  lastId,
}: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedSlug = segments[0] ?? null

  return (
    <>
      <TrackMCEventOnMount event={AnalyticsEvent.OrgListViewed} />
      {!selectedSlug ? (
        orgs.length === 0 ? (
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
                  ? `No organizations matched "${searchParams.get('q')?.trim()}".`
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
        )
      ) : (
        <ListPane>
          <ListPaneBody>
            {orgs.length === 0 ? (
              <ListPaneEmpty>No organizations match this view</ListPaneEmpty>
            ) : (
              orgs.map((org) => {
                const href = query
                  ? `/orgs/${org.slug}?${query}`
                  : `/orgs/${org.slug}`

                return (
                  <ListPaneItem
                    key={org.id}
                    href={href}
                    selected={org.slug === selectedSlug}
                    label={`View organization ${org.name ?? org.slug}`}
                    leading={
                      <OrgLogo name={org.name} src={org.logo_url} size="sm" />
                    }
                    title={
                      <span className="text-sky-600 dark:text-sky-400">
                        {org.name ?? (
                          <span className="text-muted-foreground italic">
                            Unnamed
                          </span>
                        )}
                      </span>
                    }
                    subtitle={org.primary_email ?? org.slug}
                    trailing={
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                          statusBadgeClass(org.status)
                        )}
                      >
                        {org.status}
                      </span>
                    }
                  />
                )
              })
            )}
          </ListPaneBody>
        </ListPane>
      )}
    </>
  )
}
