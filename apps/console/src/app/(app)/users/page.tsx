import { Suspense } from 'react'
import type { AdminUser, AdminUserApp } from '@876/admin'
import { Users } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Skeleton } from '@876/ui/skeleton'

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
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { USER_STATUSES, isUserStatus } from '@/lib/user-status'
import { UserSearchBar } from './_components/user-search-bar'
import { UsersTable } from './_components/users-table'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'

export const metadata = { title: 'Users' }

const USER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Users' },
  ...USER_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Users`,
  })),
]

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

export default function UsersPage({ searchParams }: Props) {
  return (
    <Page>
      <ResourceToolbar
        title="Users"
        titleFilter={
          <Suspense fallback={<Skeleton className="h-7 w-40" />}>
            <UsersStatusFilter searchParams={searchParams} />
          </Suspense>
        }
        primaryLabel="Add"
        primaryHref="/users/new"
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete users',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />
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

async function UsersStatusFilter({
  searchParams,
}: Pick<Props, 'searchParams'>) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'all' || !isUserStatus(status) ? 'all' : status

  return (
    <StatusFilterHeading
      label="Users"
      value={selectedStatus}
      options={USER_STATUS_OPTIONS}
    />
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
    const results = await Promise.all(
      users.map((u) => $876.users.listApps(u.id))
    )
    for (let i = 0; i < users.length; i++) {
      const r = results[i]
      enrollmentsMap[users[i].id] = r.error ? [] : (r.data.data ?? [])
    }
  }

  // TODO(perf): add a batch users.listAppsByUsers endpoint so enrollments do not block this table.
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
