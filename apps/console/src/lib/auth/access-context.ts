import 'server-only'

import {
  resolveEffectivePermissions,
  type AccessContext,
} from '@876/core/access'
import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
} from '@876/core/access/catalogs'
import { cache } from 'react'

import { getConsoleFeatureKeys } from '@/lib/features'
import { service } from '@/lib/service'

/**
 * Console's persisted access-grant lookup, shared by the AccessContext resolver
 * and compatibility guards. Primitive-only arguments are intentional:
 * React.cache compares argument identity with Object.is, so `{ userId }` would
 * miss the cache at otherwise identical call sites.
 */
export const resolveConsoleGrant = cache(async function resolveConsoleGrant(
  userId: string
) {
  return service.team.retrieve(userId)
})

function stringKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/**
 * Resolve all request-scoped authorization inputs once for an operator.
 * Permission storage stays Console-local, while the vocabulary and effective
 * permission algorithm come from @876/core.
 */
export const resolveAccessContext = cache(async function resolveAccessContext(
  userId: string
): Promise<AccessContext | null> {
  const member = await resolveConsoleGrant(userId)
  if (!member) return null

  const permissions =
    member.status === 'active'
      ? resolveEffectivePermissions({
          role: member.role
            ? {
                permissions: adaptStoredConsolePermissions(
                  member.role.permissions
                ),
              }
            : null,
          catalog: consolePermissionCatalog,
        })
      : []

  let features: string[] = []
  if (member.status === 'active') {
    try {
      features = stringKeys(await getConsoleFeatureKeys(userId))
    } catch {
      // Feature rollout is availability, not authorization. A provider outage
      // disables features without discarding otherwise valid permissions.
    }
  }

  return {
    subject: { userId },
    permissions,
    features,
    // TODO(posthog-experiments): populate variant assignments per §3.7 of
    // the Console access-control standard. Experiments remain presentation-only.
    experiments: {},
  }
})
