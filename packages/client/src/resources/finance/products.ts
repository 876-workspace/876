import type { AdminClient as BillingAdminClient } from '@876/billing/admin'
import type { Client as BillingClient } from '@876/billing'
import { withAdmin } from '../../internal/with-admin.ts'

export function createProductsResource({
  tenant,
  admin,
}: {
  tenant?: BillingClient
  admin?: BillingAdminClient
}) {
  const normal = tenant?.products
  const adminSurface = admin?.products
  if (normal && adminSurface) return withAdmin(normal, adminSurface)
  if (normal) return normal
  if (adminSurface) return { admin: adminSurface }
  return undefined
}
