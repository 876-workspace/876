import type { AdminClient as BillingAdminClient } from '@876/billing/admin'

export function createStatsResource(
  billingAdmin: BillingAdminClient | undefined
) {
  if (!billingAdmin) return undefined as unknown as BillingAdminClient['stats']
  return (billingAdmin as unknown as { stats: BillingAdminClient['stats'] })
    .stats
}
