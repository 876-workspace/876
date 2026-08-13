import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../internal/with-admin.ts'

type PlatformApps = SDK876Client['apps']

export type AppsResource =
  | PlatformApps
  | WithAdmin<PlatformApps, Admin876Client['apps']>

export function createAppsResource({
  platform,
  admin,
}: {
  platform: SDK876Client
  admin?: Admin876Client
}): AppsResource {
  const base: PlatformApps = platform.apps
  if (!admin) return base
  const adminApps = admin.apps
  return withAdmin(base, adminApps)
}
