import { cache } from 'react'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/services/billing'

import { DEFAULT_REPORT_TIMEZONE } from './report-params'

/** Request-cached report loading context: workspace, client, timezone. */
export const getReportContext = cache(async () => {
  const context = await getWorkspaceContext()
  if (!context) return null
  const billing = await getBilling()
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
