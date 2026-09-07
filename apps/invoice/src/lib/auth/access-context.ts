import 'server-only'

import { can, hasFeature, type AccessContext } from '@876/core/access'
import { cache } from 'react'

import { getFeatures } from '@/lib/features'
import { getAccount } from '@/lib/services/account'
import { resolvePlatformAppId } from '@/lib/services/platform-app'

export type InvoiceAccessContextOutcome =
  | { status: 'ok'; context: AccessContext }
  | { status: 'unavailable'; code: string }

/**
 * Resolves one app-access answer per request. Primitive arguments are
 * intentional: React.cache uses Object.is, so an inline options object misses.
 */
export const resolveAccessContext = cache(async function resolveAccessContext(
  userId: string,
  organizationId: string
): Promise<InvoiceAccessContextOutcome> {
  // The platform app id is generated per environment, so it is resolved from
  // the organization's entitlement rather than hard-coded. A wrong id 404s,
  // which reads as an outage and hides real access.
  const appId = await resolvePlatformAppId(organizationId)
  if (!appId) return { status: 'unavailable', code: 'platform/app-unresolved' }

  const account = await getAccount()
  const membership = await account.appMemberships.me.retrieve({
    organizationId,
    appId,
  })

  if (membership.error || !membership.data)
    return {
      status: 'unavailable',
      code: membership.error?.code ?? 'platform/unavailable',
    }

  let features: string[] = []
  try {
    features = (await getFeatures({ userId, organizationId })).featureKeys
  } catch {
    // Feature rollout is availability, not authorization. A provider outage
    // disables features without discarding otherwise valid permissions.
  }

  const active =
    membership.data.status === 'active' &&
    membership.data.assigned &&
    membership.data.entitled &&
    membership.data.revoked_at === null

  return {
    status: 'ok',
    context: {
      subject: { userId },
      permissions: active ? membership.data.effective_permissions : [],
      features,
      // TODO(posthog-experiments): populate variant assignments per §3.7 of
      // the Console access-control standard. Experiments remain presentation-only.
      experiments: {},
    },
  }
})

export function canAccess(context: AccessContext, permission: string): boolean {
  return can(context, permission)
}

export function hasAccessFeature(
  context: AccessContext,
  feature: string
): boolean {
  return hasFeature(context, feature)
}
