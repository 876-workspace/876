import type { Package, PackageStatus } from '@876/couriers/admin'

import type { CouriersCustomerRow } from './customer-rows'

/** A package as an operator reads one on the workspace list. */
export interface CouriersPackageRow {
  id: string
  /** The carrier's tracking number, or null for a package received without one. */
  trackingNum: string | null
  customerName: string | null
  description: string | null
  packageType: string
  quantity: number
  /** Pounds as the tenant recorded them; null when the package is unweighed. */
  actualWeight: number | null
  status: PackageStatus
  createdAt: number
}

export function toPackageRows(
  packages: readonly Package[],
  customers: readonly CouriersCustomerRow[]
): CouriersPackageRow[] {
  const nameById = new Map(
    customers.map((customer) => [customer.id, customer.name])
  )

  return packages.map((pkg) => ({
    id: pkg.id,
    trackingNum: pkg.tracking_num,
    customerName: nameById.get(pkg.customer_id) ?? null,
    description: pkg.description,
    packageType: pkg.package_type,
    quantity: pkg.quantity,
    actualWeight: pkg.actual_weight,
    status: pkg.status,
    createdAt: pkg.created_at,
  }))
}
