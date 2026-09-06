import { toFinanceMemberSummaries } from '@876/billing-ui/panels/access/member-identity'
import { AppError } from '@876/ui/app-error'
import { loadBillingMembers, loadUsers } from '../_data'
import { BillingMembersTablePanel } from './billing-members-table-panel'
import { UsersList } from './users-list'
export async function UsersListData({
  orgId,
  tenantId,
  canManage,
}: {
  orgId: string
  tenantId: string
  canManage: boolean
}) {
  const [result, billing] = await Promise.all([
    loadUsers(orgId),
    loadBillingMembers(tenantId),
  ])
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {result.error ? (
        <AppError
          title="Users could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <UsersList members={result.members} />
      {billing.error ? (
        <AppError
          title="Workspace roles could not be loaded"
          error={billing.error}
          variant="banner"
        />
      ) : null}
      <BillingMembersTablePanel
        members={toFinanceMemberSummaries(
          billing.members.map((m) => ({
            userId: m.userId,
            roleId: m.roleId,
            roleName: m.roleName,
            status: m.status,
          })),
          result.members.map((u) => ({
            userId: u.user_id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            avatarUrl: u.avatar,
          }))
        )}
        roles={billing.roles}
        canManage={canManage}
      />
    </div>
  )
}
