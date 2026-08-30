'use client'

import {
  CustomersTable as SharedCustomersTable,
  type CrmCustomerRow,
} from '@876/crm-ui/customer-list'

export type { CrmCustomerRow } from '@876/crm-ui/customer-list'

type Props = {
  customers: CrmCustomerRow[]
  /** Base href of the workspace's customers section. */
  customersHref: string
}

/**
 * Console host adapter for the canonical CRM customer list. Console does not
 * currently expose customer creation in the organization workspace, so it
 * intentionally omits `newCustomerHref` while sharing the exact row/list UI.
 */
export function CustomersTable({ customers, customersHref }: Props) {
  return (
    <SharedCustomersTable
      customers={customers}
      customersHref={customersHref}
      newCustomerHref={null}
    />
  )
}
