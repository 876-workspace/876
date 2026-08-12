import type { CouriersAdminClient } from '@876/couriers/admin'
import { withAdmin } from '../internal/with-admin.ts'

export function createAddressesResource(
  couriersAdmin: CouriersAdminClient | undefined
) {
  if (!couriersAdmin)
    return undefined as unknown as CouriersAdminClient['addresses']
  const base = couriersAdmin.addresses
  return withAdmin(
    base as unknown as object,
    base as unknown as object
  ) as typeof base & { admin: typeof base }
}
