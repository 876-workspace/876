'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { useBillingPermission } from '@/components/providers/permissions-provider'

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

export function CustomersToolbar({ status }: { status: string }) {
  const canWrite = useBillingPermission('customers:write')

  return (
    <ResourceToolbar
      title="Customers"
      titleFilter={
        <StatusFilterHeading
          label="Customers"
          value={status}
          options={CUSTOMER_STATUS_OPTIONS}
        />
      }
      primaryLabel={canWrite ? 'Add' : undefined}
      primaryHref={canWrite ? '/customers/new' : undefined}
      primaryVariant="info"
      refresh
      dropdownActions={
        canWrite
          ? [{ label: 'Import', icon: 'import', href: '/customers/import' }]
          : []
      }
    />
  )
}
