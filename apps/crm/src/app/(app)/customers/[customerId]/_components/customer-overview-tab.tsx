import { CustomerOverview } from '@876/crm-ui/customer-overview'

import type { CrmCustomerRow } from '@/features/customers/types'

/** Standalone CRM adapter for the shared customer overview body. */
export function CustomerOverviewTab({
  customer,
}: {
  customer: CrmCustomerRow
}) {
  return <CustomerOverview customer={customer} />
}
