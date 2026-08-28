import { cache } from 'react'
import type { AdminSubscriptionStatus } from '@876/admin'

import { $876, workspace } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'

/** Canonical organization lookup result. Consumers that render error UI use this. */
export const resolveOrgResult = cache(async (slug: string) =>
  $876.organizations.admin.retrieve({
    slug,
    includeDeleted: true,
  })
)

/**
 * Compatibility data-only lookup for metadata and callers that only need the
 * organization value. UI that must distinguish not-found from service failure
 * should use `resolveOrgResult()` instead.
 */
export const resolveOrg = cache(async (slug: string) => {
  const result = await resolveOrgResult(slug)
  return result.data ?? null
})

/** Cached organization member directory plus its registered application error. */
export const resolveOrgMembers = cache(async (orgId: string) => {
  const result = await $876.organizationMembers.admin.list(orgId, {
    limit: 100,
  })
  if (result.data?.has_more) {
    console.warn(
      '[resolveOrgMembers] org has >100 members; list is truncated',
      { orgId }
    )
  }
  return {
    data: result.data?.data ?? [],
    error: result.error,
    hasMore: result.data?.has_more ?? false,
  }
})

/** Cached role catalog plus its registered application error. */
export const resolveOrgRoles = cache(async (orgId: string) => {
  const result = await $876.roles.admin.list(orgId)
  return { data: result.data?.data ?? [], error: result.error }
})

export const resolveOrgSubscriptions = cache(
  async (orgId: string, status?: AdminSubscriptionStatus) => {
    const result = await workspace.apps.entitlements.list({
      organizationId: orgId,
      status,
    })
    return { data: result.data ?? [], error: result.error }
  }
)

export const resolveOrgBillingAccounts = cache(async (orgId: string) => {
  const result = await $876.billingAccounts.list({
    organizationId: orgId,
    limit: 25,
  })
  return { data: result.data ?? null, error: result.error }
})

/** Active app slugs plus the entitlement lookup error, if any. */
export const resolveOrgEntitledAppSlugs = cache(async (orgId: string) => {
  const subscriptions = await resolveOrgSubscriptions(orgId)
  return {
    data: subscriptions.data
      .filter((subscription) =>
        subscription.status === 'active' || subscription.status === 'trialing'
      )
      .flatMap((subscription) =>
        subscription.app_slug ? [subscription.app_slug] : []
      ),
    error: subscriptions.error,
  }
})

/**
 * The CRM customer record representing this organization in 876's own workspace.
 * A missing CRM workspace is a normal state; every other registered failure is
 * preserved for the caller to render without escalating into a framework error.
 */
export const resolveOrgCustomerWithUs = cache(async (orgId: string) => {
  const platformOrg = await getPlatformOrganization()
  if (!platformOrg) return { data: null, error: null }

  const result = await $876.customerProfiles.list(platformOrg.id, {
    customerOrganizationId: orgId,
  })
  if (result.error?.code === 'crm/tenant-not-found')
    return { data: null, error: null }

  return { data: result.data?.data[0] ?? null, error: result.error }
})
