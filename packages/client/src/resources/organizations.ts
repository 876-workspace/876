import type { create876AdminClient } from '@876/admin'
import type { create876Client as createPlatformClient } from '@876/sdk'
import { withAdmin } from '../internal/with-admin.ts'

type Platform = ReturnType<typeof createPlatformClient>
type Admin = ReturnType<typeof create876AdminClient>

export function createOrganizationsResource({
  platform,
  admin,
}: {
  platform: Platform
  admin?: Admin
}) {
  const base = (platform as unknown as { organizations: object }).organizations as object
  if (!admin) return base as unknown as typeof base
  const adminOrgs = (admin as unknown as { organizations: object }).organizations as object
  const withAdminRes = withAdmin(base as object, adminOrgs as object) as unknown as typeof base & { admin: typeof adminOrgs }
  // Also spread admin methods at top level for console backward compat ($876.organizations.list)
  return {
    ...(withAdminRes as object),
    ...(adminOrgs as object),
  } as unknown as typeof withAdminRes & typeof adminOrgs
}
