import type { CouriersAdminClient } from '@876/couriers/admin'

export function createTeamResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined
  return couriersAdmin.team
}
