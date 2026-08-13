import type { CouriersAdminClient } from '@876/couriers/admin'

export function createCouriersRolesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.roles
}
