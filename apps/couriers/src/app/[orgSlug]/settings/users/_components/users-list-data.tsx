import { PendingInvites } from '../_components/pending-invites'
import { UsersList } from '../_components/users-list'
import { listTeamData } from '../_lib/team-members'

/**
 * Data half of the list column. Rendered inside a Suspense boundary so the
 * toolbar is interactive before the member list and its per-member identity
 * lookups resolve.
 */
export async function UsersListData({ orgSlug }: { orgSlug: string }) {
  const data = await listTeamData(orgSlug)
  if (!data)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s users. Please try again.
      </div>
    )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <UsersList
        rows={data.rows}
        orgSlug={orgSlug}
        pending={
          <PendingInvites orgSlug={orgSlug} invites={data.pendingInvites} />
        }
      />
    </div>
  )
}
