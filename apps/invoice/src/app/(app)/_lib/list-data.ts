import 'server-only'

import { cache } from 'react'

import { getBilling } from '@/lib/services/billing'

/**
 * Request-cached list reads, shared by a section's list column and the record
 * that opens beside it.
 *
 * The list lives in the section's `layout.tsx` and the record in its `[id]`
 * page, so both render on the same request — and the Billing SDK has no
 * `retrieve` for quotes or invoices, which means the record resolves itself out
 * of the same list. Without `cache()` that is two identical unbounded requests
 * on every open, both on the blocking path.
 *
 * Keyed on the organization id alone, so `Object.is` on the argument actually
 * hits. Do not pass an options object here — a fresh literal per call defeats
 * the memoization entirely.
 */
export const listQuotes = cache(async (organizationId: string) => {
  const billing = await getBilling(organizationId)
  return billing.quotes.list()
})

export const listInvoices = cache(async (organizationId: string) => {
  const billing = await getBilling(organizationId)
  return billing.invoices.list()
})

export const listPayments = cache(async (organizationId: string) => {
  const billing = await getBilling(organizationId)
  return billing.payments.list()
})
