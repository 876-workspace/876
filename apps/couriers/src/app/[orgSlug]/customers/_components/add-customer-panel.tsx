'use client'

import type { CustomerBranchOption } from './customer-branch-field'
import { CustomerForm } from './customer-form'

export function AddCustomerPanel({
  orgSlug,
  branches,
  customerCreationEnabled,
}: {
  orgSlug: string
  branches: CustomerBranchOption[] | Promise<CustomerBranchOption[]>
  customerCreationEnabled: boolean
}) {
  if (!customerCreationEnabled)
    return (
      <div className="876-empty-dashed max-w-2xl">
        Customer creation is currently paused.
      </div>
    )

  return <CustomerForm orgSlug={orgSlug} branches={branches} />
}
