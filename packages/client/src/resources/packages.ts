import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../internal/with-admin.ts'

export function createPackagesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin)
    return undefined as unknown as CouriersAdminClient['packages']
  const base = couriersAdmin.packages
  // normal + admin are same transport; admin is explicit alias
  return withAdmin(
    base as unknown as object,
    base as unknown as object
  ) as typeof base & { admin: typeof base }
}
