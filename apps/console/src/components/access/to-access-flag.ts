import type { AdminFeature, AdminFeatureGrants } from '@876/admin'

import type { AccessFlag } from './feature-access-board'

/**
 * Maps a feature plus its overrides into the board's row shape.
 *
 * Identity arrives as raw fields from the API — the display name is composed
 * here rather than server-side, so the client keeps one set of formatting
 * rules across every access surface.
 */
export function toAccessFlag(
  feature: AdminFeature,
  grants: AdminFeatureGrants | null,
  child: boolean
): AccessFlag {
  return {
    id: feature.id,
    slug: feature.slug,
    name: feature.name,
    enabled: feature.enabled,
    child,
    orgOverrides: (grants?.organizations.data ?? []).map((grant) => ({
      id: grant.organization_id,
      name: grant.organization_name ?? grant.organization_slug,
      detail: grant.organization_slug,
      avatarUrl: grant.organization_logo_url,
      enabled: grant.status === 'enabled',
    })),
    userOverrides: (grants?.users.data ?? []).map((grant) => ({
      id: grant.user_id,
      name:
        [grant.user_first_name, grant.user_last_name]
          .filter(Boolean)
          .join(' ') ||
        grant.user_username ||
        grant.user_email,
      detail: grant.user_email,
      avatarUrl: grant.user_avatar,
      enabled: grant.status === 'enabled',
    })),
  }
}

/** Reads the overrides for a set of features in one pass. */
export async function loadGrants(
  features: readonly AdminFeature[],
  retrieveGrants: (
    featureId: string
  ) => Promise<{ data: AdminFeatureGrants | null }>
): Promise<Map<string, AdminFeatureGrants | null>> {
  return new Map(
    await Promise.all(
      features.map(async (feature) => {
        const { data } = await retrieveGrants(feature.id)
        return [feature.id, data] as const
      })
    )
  )
}
