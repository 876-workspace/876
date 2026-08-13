import type { CouriersAdminClient } from '@876/couriers/admin'

export function createBranchesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.branches
}
