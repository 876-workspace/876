import { cache } from 'react'
import type { AdminSubscriptionStatus } from '@876/admin'

import { $876, workspace } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'

/**
 * Resolve an organization by slug, including soft-deleted records so Mission
 * Control can display deleted org detail pages with a tombstone banner.
 * Wrapped in React `cache()` so the segment layout, the overview page, and
 * each tab page dedupe to a single fetch per request.
 */
export const resolveOrg = cache(async (slug: string) => {
  const result = await $876.organizations.admin.retrieve({
    slug,
    includeDeleted: true,
  })
  if (result.error) return null
  return result.data
})

/**
 * Cached organization member directory (membership + user identity).
 *
 * Use the canonical organization-members resource instead of composing the
 * roster from `/memberships` followed by a separate `/users?ids=...` batch.
 * The organization detail layout and Members tab share this cached request,
 * so the member count and table cannot trigger duplicate roster reads during
 * the same render.
 */
export const resolveOrgMembers = cache(async (orgId: string) => {
  const result = await $876.organizationMembers.admin.list(orgId, {
    limit: 100,
  })
  if (result.error) throw new Error(result.error.message)
  if (result.data?.has_more) {
    console.warn(
      '[resolveOrgMembers] org has >100 members; list is truncated',
      { orgId }
    )
  }
  return result.data
})

/** Cached role catalog used by member-management controls. */
export const resolveOrgRoles = cache(async (orgId: string) => {
  const result = await $876.roles.admin.list(orgId)
  if (result.error) throw new Error(result.error.message)
  return result.data?.data ?? []
})

export const resolveOrgSubscriptions = cache(
  async (orgId: string, status?: AdminSubscriptionStatus) => {
    const result = await workspace.apps.entitlements.list({
      organizationId: orgId,
      status,
    })
    if (result.error) throw new Error(result.error.message)
    return result.data
  }
)

export const resolveOrgBillingAccounts = cache(async (orgId: string) => {
  const result = await $876.billingAccounts.list({
    organizationId: orgId,
    limit: 25,
  })
  if (result.error) throw new Error(result.error.message)
  return result.data
})

/**
 * The app slugs an organization currently holds an active entitlement for.
 *
 * Shared by the detail tab strip, the workspace index, and each workspace
 * shell, all of which ask the same question on the same render. Cached through
 * `resolveOrgSubscriptions`, so asking three times costs one request.
 */
export const resolveOrgEntitledAppSlugs = cache(async (orgId: string) => {
  const subscriptions = await resolveOrgSubscriptions(orgId)
  return (subscriptions ?? [])
    .filter((s) => s.status === 'active' || s.status === 'trialing')
    .flatMap((s) => (s.app_slug ? [s.app_slug] : []))
})

/**
 * The CRM customer record representing this organization in **876's own**
 * workspace.
 *
 * This is the org-as-customer side of the split: not a customer *of* this
 * organization, but the customer *record for* it in our tenant, which is what
 * its support requests with us hang off. Every 876 organization has one,
 * delivered by Core's `customer.ensure` outbox.
 */
export const resolveOrgCustomerWithUs = cache(async (orgId: string) => {
  const platformOrg = await getPlatformOrganization()
  if (!platformOrg) return null

  const result = await $876.customerProfiles.list(platformOrg.id, {
    customerOrganizationId: orgId,
  })
  // A workspace we have not provisioned yet is a state, not a failure.
  if (result.error?.code === 'crm/tenant-not-found') return null
  if (result.error) throw new Error(result.error.message)

  return result.data?.data[0] ?? null
})
