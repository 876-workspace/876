'use client'

import {
  CondensedCustomersTable,
  CustomersTable,
  type CrmCustomerRow,
} from '@876/crm-ui/customer-list'
import { useDetailSegments } from '@876/ui/list-detail-shell'

type Props = {
  customers: readonly CrmCustomerRow[]
  customersHref: string
}

/** Route-aware Console adapter around the canonical CRM customer tables. */
export function CustomerList({ customers, customersHref }: Props) {
  const selectedId = useDetailSegments()[0] ?? null

  if (!selectedId)
    return (
      <CustomersTable customers={customers} customersHref={customersHref} />
    )

  return (
    <CondensedCustomersTable
      customers={customers}
      selectedId={selectedId}
      customersHref={customersHref}
    />
  )
}
