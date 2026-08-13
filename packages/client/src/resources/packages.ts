import type { CouriersAdminClient } from '@876/couriers/admin'

export function createPackagesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.packages
}
