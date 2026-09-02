import { AppError } from '@876/ui/app-error'

import { loadUsers } from '../_data'
import { UsersList } from './users-list'

export async function UsersListData({ orgId }: { orgId: string }) {
  const result = await loadUsers(orgId)
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
    </div>
  )
}
