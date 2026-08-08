import { Suspense } from 'react'
import type { AdminUser, AdminUserApp } from '@876/admin'
import { Users } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { isUserStatus } from '@/lib/user-status'
import { UserSearchBar } from '../_components/user-search-bar'
import { UsersTable } from '../_components/users-table'
import { USERS_SKELETON_COLUMNS } from '../_components/users-skeleton-columns'
import { UsersToolbar } from '../_components/users-toolbar'

export const metadata = { title: 'Users' }

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

export default async function UsersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'all' || !isUserStatus(status) ? 'all' : status

  return (
    <Page>
      <UsersToolbar status={selectedStatus} />
      <div className="mb-4 max-w-sm">
        <Suspense>
          <UserSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />}
      >
        <UsersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function UsersTableData({ searchParams }: Pick<Props, 'searchParams'>) {
  const { after, before, q, status } = await searchParams

  const isSearching = Boolean(q?.trim())
  const selectedStatus =
    status === 'all' || !isUserStatus(status) ? 'all' : status
  const userStatus = selectedStatus === 'all' ? undefined : selectedStatus

  let users: AdminUser[] = []
  let hasMore = false

  if (isSearching) {
    const result = await $876.users.search({
      query: q!,
      limit: 50,
      status: userStatus,
    })
    if (result.error) throw new Error(result.error.message)
    users = result.data.data
  } else {
    const result = await $876.users.list({
      limit: 25,
      startingAfter: after,
      endingBefore: before,
      status: userStatus,
    })
    if (result.error) throw new Error(result.error.message)
    users = result.data.data
    hasMore = result.data.has_more
  }

  const enrollmentsMap: Record<string, AdminUserApp[]> = {}
  if (users.length > 0) {
    const result = await $876.users.listAppsByUsers(users.map((u) => u.id))
    if (!result.error && result.data) {
      for (const group of result.data.data) {
        enrollmentsMap[group.user_id] = group.data ?? []
      }
      for (const u of users) {
        if (!(u.id in enrollmentsMap)) enrollmentsMap[u.id] = []
      }
    } else {
      for (const u of users) enrollmentsMap[u.id] = []
    }
  }

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.UserListViewed}
        properties={{ filter_applied: Boolean(q || after || before || status) }}
      />
      {users.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{isSearching ? 'No results' : 'No users'}</EmptyTitle>
            <EmptyDescription>
              {isSearching ? `No users matched "${q}".` : 'No users found.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <UsersTable
          data={users}
          enrollmentsMap={enrollmentsMap}
          isSearching={isSearching}
          hasMore={hasMore}
          firstId={users[0]?.id ?? null}
          lastId={users[users.length - 1]?.id ?? null}
        />
      )}
    </>
  )
}
