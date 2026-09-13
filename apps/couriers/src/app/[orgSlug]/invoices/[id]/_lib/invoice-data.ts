import 'server-only'

import { cache } from 'react'

import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'

/** Resolve the invoice shared by the detail header and the overview page. */
export const resolveInvoice = cache(async (orgSlug: string, id: string) => {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const result = await billingIntegration.invoices.retrieve(ctx.orgId, id)
  if (result.error) {
    if (result.error.code === 'invoice/not-found') return null
    throw new Error(result.error.message)
  }
  return result.data
})
