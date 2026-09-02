import type { BillingCustomer } from '@876/billing/service'
import type { Customer, CustomerStatus } from '@876/couriers/admin'

/**
 * A courier customer as an operator reads one.
 *
 * A Couriers customer profile carries no name of its own — it points at the
 * organization's registry customer, which owns the party identity
 * (`.claude/rules/customer-architecture.md`). The name and the branch are
 * therefore resolved from one page-wide lookup each, never per row.
 */
export interface CouriersCustomerRow {
  id: string
  /** The registry party's name, or null when the registry has no row for it. */
  name: string | null
  billingCustomerId: string
  branchName: string | null
  trn: string | null
  isCommercial: boolean
  status: CustomerStatus
  createdAt: number
}

export function toCustomerRows(
  customers: readonly Customer[],
  registry: readonly BillingCustomer[],
  branches: readonly { id: string; name: string }[]
): CouriersCustomerRow[] {
  const nameById = new Map(
    registry.map((customer) => [customer.id, customer.name])
  )
  const branchById = new Map(branches.map((branch) => [branch.id, branch.name]))

  return customers.map((customer) => ({
    id: customer.id,
    name: nameById.get(customer.billing_customer_id) ?? null,
    billingCustomerId: customer.billing_customer_id,
    branchName: customer.branch_id
      ? (branchById.get(customer.branch_id) ?? null)
      : null,
    trn: customer.trn,
    isCommercial: customer.is_commercial,
    status: customer.status,
    createdAt: customer.created_at,
  }))
}
