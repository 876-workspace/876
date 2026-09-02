import type { Branch } from '@876/couriers/admin'

/** A branch as an operator reads one, with its address flattened for display. */
export interface CouriersBranchRow {
  id: string
  name: string
  line1: string
  city: string
  countryCode: string
  phone: string | null
  isDefault: boolean
  isActive: boolean
}

export function toBranchRows(branches: readonly Branch[]): CouriersBranchRow[] {
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    line1: branch.address.line1,
    city: branch.address.city,
    countryCode: branch.address.country_code,
    phone: branch.phone,
    isDefault: branch.is_default,
    isActive: branch.is_active,
  }))
}
