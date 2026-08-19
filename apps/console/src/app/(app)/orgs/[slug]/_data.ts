import { cache } from 'react'

import { $876 } from '@/lib/876'

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

export const resolveOrgSubscriptions = cache(async (orgId: string) => {
  const result = await $876.organizations.admin.subscriptions.list({
    organizationId: orgId,
  })
  if (result.error) throw new Error(result.error.message)
  return result.data
})

export const resolveOrgBillingAccounts = cache(async (orgId: string) => {
  const result = await $876.billingAccounts.list({
    organizationId: orgId,
    limit: 25,
  })
  if (result.error) throw new Error(result.error.message)
  return result.data
})
