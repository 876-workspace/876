import 'server-only'

import { cache } from 'react'

import { billingIntegration } from '@/lib/clients/billing'
import { getManageContext } from '@/lib/auth/manage-context'

/** Resolve the payment shared by the detail card and its metadata. */
export const resolvePayment = cache(async (orgSlug: string, id: string) => {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const result = await billingIntegration.payments.retrieve(ctx.orgId, id)
  if (result.error) {
    if (result.error.code === 'payment/not-found') return null
    throw new Error(result.error.message)
  }
  return result.data
})
