import type { AdminClient as BillingAdminClient } from '@876/billing/admin'

export function createStatsResource(admin?: BillingAdminClient) {
  if (!admin) return undefined
  return admin.stats
}
