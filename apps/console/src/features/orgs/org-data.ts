import { billing } from '@/lib/services/billing'
import { crm } from '@/lib/services/crm'
import { platform } from '@/lib/services/platform'
import { workspace } from '@/lib/services/workspace'
import { cache } from 'react'
import type { AdminSubscriptionStatus } from '@876/platform/compat'

import { getPlatformOrganization } from '@/lib/platform-org'

/**
 * Canonical organization lookup, including soft-deleted records so Console can
 * show a tombstone banner on a deleted org's detail page.
 *
 * Wrapped in React `cache()` so the segment layout, the overview page, and each
 * tab page dedupe to a single fetch per request. Callers that must tell a real
 * "no such organization" apart from a service failure read this result; the
 * error is preserved rather than collapsed into `null`.
 */
export const resolveOrgResult = cache(async (slug: string) =>
  platform.organizations.retrieve({
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

/** Cached active organization directory for workspace selection surfaces. */
export const resolveActiveOrganizations = cache(async () =>
  platform.organizations.list({ limit: 50, status: 'active' })
)

/**
 * Cached organization member directory (membership + user identity), plus its
 * registered application error.
 *
 * Uses the canonical organization-members resource instead of composing the
 * roster from `/memberships` followed by a separate `/users?ids=...` batch. The
 * organization detail layout and Members tab share this cached request, so the
 * member count and the table cannot trigger duplicate roster reads during the
 * same render.
 */
export const resolveOrgMembers = cache(async (orgId: string) => {
  const result = await workspace.members.list(orgId, {
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

/** Cached role catalog used by member-management controls, plus its error. */
export const resolveOrgRoles = cache(async (orgId: string) => {
  const result = await workspace.roles.list(orgId)
  return { data: result.data?.data ?? [], error: result.error }
})

/** Cached org entitlements, plus the registered lookup error. */
export const resolveOrgSubscriptions = cache(
  async (orgId: string, status?: AdminSubscriptionStatus) => {
    const result = await workspace.organizations.subscriptions.list({
      organizationId: orgId,
      status,
    })
    return { data: result.data ?? [], error: result.error }
  }
)

/** Cached billing accounts for the org, plus the registered lookup error. */
export const resolveOrgBillingAccounts = cache(async (orgId: string) => {
  const result = await workspace.billingAccounts.list({
    organizationId: orgId,
    limit: 25,
  })
  return { data: result.data?.data ?? [], error: result.error }
})

/**
 * The app slugs an organization currently holds an active entitlement for, plus
 * the entitlement lookup error if there was one.
 *
 * Shared by the detail tab strip, the workspace index, and each workspace
 * shell, all of which ask the same question on the same render. Cached through
 * `resolveOrgSubscriptions`, so asking three times costs one request.
 */
export const resolveOrgEntitledAppSlugs = cache(async (orgId: string) => {
  const subscriptions = await resolveOrgSubscriptions(orgId)
  return {
    data: subscriptions.data
      .filter(
        (subscription) =>
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

  const result = await crm.customers.list(platformOrg.id, {
    customerOrganizationId: orgId,
  })
  if (result.error?.code === 'crm/tenant-not-found')
    return { data: null, error: null }

  return { data: result.data?.data[0] ?? null, error: result.error }
})
