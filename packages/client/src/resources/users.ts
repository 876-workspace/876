import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../internal/with-admin.ts'

type MeResource = SDK876Client['users']

export type UsersResource = { me: MeResource } | WithAdmin<
  { me: MeResource },
  Admin876Client['users']
>

export function createUsersResource({
  platform,
  admin,
}: {
  platform: SDK876Client
  admin?: Admin876Client
}): UsersResource {
  const me: MeResource = platform.users
  if (!admin) return { me }
  const adminUsers = admin.users
  return withAdmin({ me }, adminUsers)
}
