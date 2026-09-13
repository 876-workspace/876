'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Customers', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

export function CustomersToolbar({
  status,
  showPrimary,
}: {
  status: string
  /** The Add action belongs to the list view; a record on screen is the subject. */
  showPrimary: boolean
}) {
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
      primaryLabel="Add"
      primaryIconOnly={!showPrimary}
      primaryHref="/customers/new"
      primaryVariant="info"
      refresh
      dropdownActions={[
        { label: 'Import', icon: 'import', href: '/customers/import' },
      ]}
    />
  )
}
