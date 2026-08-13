import type { CouriersAdminClient } from '@876/couriers/admin'

export function createWarehousesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.warehouses
}
