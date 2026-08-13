import type { CouriersAdminClient } from '@876/couriers/admin'

export function createTenantsResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.tenants
}
