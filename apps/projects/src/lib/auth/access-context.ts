import 'server-only'

import {
  can,
  hasFeature,
  hasModule,
  type AccessContext,
} from '@876/core/access'
import { cache } from 'react'

import { getAccount } from '@/lib/services/account'
import { resolvePlatformAppId } from '@/lib/services/platform-app'

import type { ProjectsAccessContextOutcome } from '@/types/access'

export type { ProjectsAccessContextOutcome }

/**
 * Resolves one app-access answer per request. Primitive arguments are
 * intentional: React.cache uses Object.is, so an inline options object misses.
 */
export const resolveAccessContext = cache(async function resolveAccessContext(
  userId: string,
  organizationId: string
): Promise<ProjectsAccessContextOutcome> {
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

  const active =
    membership.data.status === 'active' &&
    membership.data.assigned &&
    membership.data.entitled &&
    membership.data.revoked_at === null

  return {
    status: 'ok',
    context: {
      subject: { userId },
      modules: active ? (membership.data.entitled_modules ?? []) : [],
      permissions: active ? membership.data.effective_permissions : [],
      // Projects v1 has no platform rollout flags. UI shell preferences are
      // resolved separately and must not masquerade as CRM feature flags.
      features: [],
      // TODO(posthog-experiments): populate variant assignments per §3.7 of
      // the Console access-control standard. Experiments remain presentation-only.
      experiments: {},
    },
  }
})

export function canAccess(context: AccessContext, permission: string): boolean {
  return can(context, permission)
}

export function canAccessModule(
  context: AccessContext,
  module: string
): boolean {
  return hasModule(context, module)
}

export function hasAccessFeature(
  context: AccessContext,
  feature: string
): boolean {
  return hasFeature(context, feature)
}
