export const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All Customers', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  {
    value: 'suspended',
    label: 'Suspended',
    headingLabel: 'Suspended Customers',
  },
]

export const CUSTOMERS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]

export type CustomerStatusFilter = 'all' | 'active' | 'suspended'

/** An absent or unknown `?status=` value means no filter. */
export function resolveCustomerStatusFilter(
  status: string | null | undefined
): CustomerStatusFilter {
  return status === 'active' || status === 'suspended' ? status : 'all'
}
