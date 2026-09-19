import 'server-only'

import { cache } from 'react'

import { billingIntegration } from '@/lib/clients/billing'
import { getManageContext } from '@/lib/auth/manage-context'

/** Resolve the shared-catalog item behind the item detail header and body. */
export const resolveItem = cache(async (orgSlug: string, id: string) => {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const result = await billingIntegration.items.retrieve(ctx.orgId, id)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) return null
    return { item: null, error: result.error }
  }
  return { item: result.data, error: null }
})

/** Lightweight title resolver for generateMetadata — shares resolveItem's cache. */
export const resolveItemTitle = cache(async (orgSlug: string, id: string) => {
  const resolved = await resolveItem(orgSlug, id)
  return resolved?.item?.name ?? null
})
