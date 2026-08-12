import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../internal/with-admin.ts'

export function createTeamResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin) return undefined as unknown as CouriersAdminClient['team']
  const base = couriersAdmin.team
  return withAdmin(
    base as unknown as object,
    base as unknown as object
  ) as typeof base & { admin: typeof base }
}
