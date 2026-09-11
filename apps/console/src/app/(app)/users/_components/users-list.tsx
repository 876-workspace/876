'use client'

import { useSearchParams } from 'next/navigation'
import type { AdminUser, AdminUserApp } from '@876/platform/compat'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { usePathDetailSegments } from '@876/ui/list-detail-shell'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { initialsOf } from './columns'
import { UsersTable } from './users-table'

type Props = {
  users: AdminUser[]
  enrollmentsMap: Record<string, AdminUserApp[]>
  isSearching: boolean
  hasMore: boolean
  firstId: string | null
  lastId: string | null
  filterApplied: boolean
}

function displayNameOf(user: AdminUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || '—'
}

/**
 * The list column in both of its forms: the full-width table when no user is
 * open, and the condensed sidebar list when one is.
 *
 * Both forms live in one component so the surrounding grid track — not a
 * component swap — decides the width. The query-aware parallel route owns
 * server-side status/search filtering and pagination.
 */
export function UsersList({
  users,
  enrollmentsMap,
  isSearching,
  hasMore,
  firstId,
  lastId,
  filterApplied,
}: Props) {
  // Rendered inside the `@list` slot, where layout segments describe the slot
  // rather than the open record, so selection comes from the pathname.
  const segments = usePathDetailSegments('/users')
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.UserListViewed}
        properties={{ filter_applied: filterApplied }}
      />
      {!selectedId ? (
        users.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>{isSearching ? 'No results' : 'No users'}</EmptyTitle>
              <EmptyDescription>
                {isSearching
                  ? `No users matched "${searchParams.get('q')?.trim()}".`
                  : 'No users found.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <UsersTable
            data={users}
            enrollmentsMap={enrollmentsMap}
            isSearching={isSearching}
            hasMore={hasMore}
            firstId={firstId}
            lastId={lastId}
          />
        )
      ) : (
        <ListPane>
          <ListPaneBody>
            {users.length === 0 ? (
              <ListPaneEmpty>No users match this view</ListPaneEmpty>
            ) : (
              users.map((user) => {
                const key = user.username ?? user.id
                const href = query ? `/users/${key}?${query}` : `/users/${key}`

                return (
                  <ListPaneItem
                    key={user.id}
                    href={href}
                    selected={key === selectedId}
                    label={`View user ${displayNameOf(user)}`}
                    leading={
                      <Avatar className="size-7">
                        {user.avatar && (
                          <AvatarImage src={user.avatar} alt="" />
                        )}
                        <AvatarFallback className="text-[0.5625rem]">
                          {initialsOf(user)}
                        </AvatarFallback>
                      </Avatar>
                    }
                    title={
                      <span className="text-sky-600 dark:text-sky-400">
                        {displayNameOf(user)}
                      </span>
                    }
                    subtitle={user.email}
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
