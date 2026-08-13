import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../../internal/with-admin.ts'

type PlatformOrganizations = SDK876Client['organizations']

export type OrganizationsResource =
  | PlatformOrganizations
  | WithAdmin<PlatformOrganizations, Admin876Client['organizations']>

export function createOrganizationsResource({
  platform,
  admin,
}: {
  platform: SDK876Client
  admin?: Admin876Client
}): OrganizationsResource {
  const base: PlatformOrganizations = platform.organizations
  if (!admin) return base
  const adminOrgs = admin.organizations
  return withAdmin(base, adminOrgs)
}
