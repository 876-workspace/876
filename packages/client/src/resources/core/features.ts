import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../../internal/with-admin.ts'

type PlatformFeatures = SDK876Client['features']

export type FeaturesResource =
  | PlatformFeatures
  | WithAdmin<PlatformFeatures, Admin876Client['features']>

export function createFeaturesResource({
  platform,
  admin,
}: {
  platform: SDK876Client
  admin?: Admin876Client
}): FeaturesResource {
  const base: PlatformFeatures = platform.features
  if (!admin) return base
  const adminFeatures = admin.features
  return withAdmin(base, adminFeatures)
}
