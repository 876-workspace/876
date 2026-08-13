import type { CouriersAdminClient } from '@876/couriers/admin'

export function createSettingsResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.settings
}
