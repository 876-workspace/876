import { cache } from 'react'

import { $876 } from '@/lib/876'

/**
 * Resolve an organization by slug, including soft-deleted records so Mission
 * Control can display deleted org detail pages with a tombstone banner.
 * Wrapped in React `cache()` so the segment layout, the overview page, and
 * each tab page dedupe to a single fetch per request.
 */
export const resolveOrg = cache(async (slug: string) => {
  const result = await $876.orgs.retrieveBySlug(slug, { include_deleted: true })
  if (result.error) return null
  return result.data
})

/** Cached membership list for an organization (id-keyed). */
export const resolveOrgMembers = cache(async (orgId: string) => {
  const result = await $876.orgs.listMemberships(orgId, { limit: 50 })
  if (result.error) throw new Error(result.error.message)
  if (result.data?.has_more) {
    console.warn('[resolveOrgMembers] org has >50 members; list is truncated', {
      orgId,
    })
  }
  return result.data
})

export const resolveOrgSubscriptions = cache(async (orgId: string) => {
  const result = await $876.orgs.subscriptions.list(orgId)
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
