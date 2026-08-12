import type { create876AdminClient } from '@876/admin'
import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>
type Admin = ReturnType<typeof create876AdminClient>

export function createUsersResource({
  platform,
  admin,
}: {
  platform: Platform
  admin?: Admin
}) {
  const me = {
    retrieve: (options?: unknown) => (platform as unknown as { users: { retrieve: (o?: unknown)=> Promise<unknown> } }).users.retrieve(options as never),
    update: (params: unknown, options?: unknown) =>
      (platform as unknown as { users: { update: (p: unknown, o?: unknown)=> Promise<unknown> } }).users.update(params as never, options as never),
    profile: (platform as unknown as { users: { profile: unknown } }).users.profile,
    addresses: (platform as unknown as { users: { addresses: unknown } }).users.addresses,
    contacts: (platform as unknown as { users: { contacts: unknown } }).users.contacts,
    memberships: (platform as unknown as { users: { memberships: unknown } }).users.memberships,
  }

  if (!admin) {
    return { me } as unknown as { me: typeof me }
  }

  const adminUsers = (admin as unknown as { users: unknown }).users as object
  // Expose both me/admin and flat admin methods for backward compat (console still uses $876.users.list)
  return {
    me,
    admin: adminUsers,
    ...(adminUsers as object),
  } as unknown as { me: typeof me; admin: typeof adminUsers } & typeof adminUsers
}
