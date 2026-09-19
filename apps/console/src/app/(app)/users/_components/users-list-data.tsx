import { AppError } from '@876/ui/app-error'
import type { AdminUser, AdminUserApp } from '@876/platform/compat'

import { platform } from '@/lib/clients/platform'
import { isUserStatus } from '@/lib/user-status'
import { UsersList } from './users-list'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves. It belongs in
 * the query-aware parallel route rather than the layout: user directories are
 * paginated server-side and must refetch when their URL query changes.
 */
export async function UsersListData({
  after,
  before,
  q,
  status,
}: {
  after?: string
  before?: string
  q?: string
  status?: string
}) {
  const selectedStatus =
    status === 'all' || !isUserStatus(status) ? 'all' : status
  const userStatus = selectedStatus === 'all' ? undefined : selectedStatus
  const isSearching = Boolean(q?.trim())
  const result = isSearching
    ? await platform.users.search({
        query: q!.trim(),
        limit: 50,
        status: userStatus,
      })
    : await platform.users.list({
        limit: 25,
        startingAfter: after,
        endingBefore: before,
        status: userStatus,
      })

  const users: AdminUser[] = result.data?.data ?? []
  const hasMore = isSearching ? false : (result.data?.has_more ?? false)

  const enrollmentsMap: Record<string, AdminUserApp[]> = {}
  let enrollmentsError: typeof result.error = null
  if (users.length > 0) {
    const enrollments = await platform.users.listAppsByUsers(
      users.map((u) => u.id)
    )
    if (!enrollments.error && enrollments.data) {
      for (const group of enrollments.data.data) {
        enrollmentsMap[group.user_id] = group.data ?? []
      }
      for (const u of users) {
        if (!(u.id in enrollmentsMap)) enrollmentsMap[u.id] = []
      }
    } else {
      enrollmentsError = enrollments.error
      for (const u of users) enrollmentsMap[u.id] = []
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {result.error ? (
        <AppError
          title="Some user data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      {enrollmentsError ? (
        <AppError
          title="User app memberships could not be loaded"
          error={enrollmentsError}
          variant="banner"
          showCode
        />
      ) : null}
      <UsersList
        users={users}
        enrollmentsMap={enrollmentsMap}
        isSearching={isSearching}
        hasMore={hasMore}
        firstId={users[0]?.id ?? null}
        lastId={users[users.length - 1]?.id ?? null}
        filterApplied={Boolean(q || after || before || status)}
      />
    </div>
  )
}
