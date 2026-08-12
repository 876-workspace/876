import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../internal/with-admin.ts'

export function createBranchesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin)
    return undefined as unknown as CouriersAdminClient['branches']
  const base = couriersAdmin.branches
  return withAdmin(
    base as unknown as object,
    base as unknown as object
  ) as typeof base & { admin: typeof base }
}
