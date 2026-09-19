import { cache } from 'react'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/clients/billing'

import { DEFAULT_REPORT_TIMEZONE } from './report-params'

/** Request-cached report loading context: organization, client, timezone. */
export const getInvoiceReportContext = cache(async () => {
  const context = await getInvoiceContext()
  if (!context) return null
  const billing = await getBilling(context.orgId)
  const preferences = await billing.reportPreferences.retrieve()
  return {
    context,
    billing,
    timeZone: preferences.error
      ? DEFAULT_REPORT_TIMEZONE
      : preferences.data.timezone,
  }
})

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
