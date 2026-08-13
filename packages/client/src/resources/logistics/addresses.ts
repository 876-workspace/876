import type { CouriersAdminClient } from '@876/couriers/admin'

export function createAddressesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.addresses
}
