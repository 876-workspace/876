import type { create876AdminClient } from '@876/admin'
import type { create876Client as createPlatformClient } from '@876/sdk'
import { withAdmin } from '../internal/with-admin.ts'

type Platform = ReturnType<typeof createPlatformClient>
type Admin = ReturnType<typeof create876AdminClient>

export function createAppsResource({
  platform,
  admin,
}: {
  platform: Platform
  admin?: Admin
}) {
  const base = (platform as unknown as { apps: object }).apps as object
  if (!admin) return base as unknown as typeof base
  const adminApps = (admin as unknown as { apps: object }).apps as object
  const withAdminRes = withAdmin(base as object, adminApps as object) as unknown as typeof base & { admin: typeof adminApps }
  return {
    ...(withAdminRes as object),
    ...(adminApps as object),
  } as unknown as typeof withAdminRes & typeof adminApps
}
