'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const RECURRING_INVOICE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Recurring Invoices' },
  { value: 'active', label: 'Active', headingLabel: 'Active Recurring Invoices' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Recurring Invoices' },
  {
    value: 'stopped',
    label: 'Stopped',
    headingLabel: 'Stopped Recurring Invoices',
  },
  {
    value: 'expired',
    label: 'Expired',
    headingLabel: 'Expired Recurring Invoices',
  },
]

export function RecurringInvoicesToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Recurring Invoices"
      titleFilter={
        <StatusFilterHeading
          label="Recurring Invoices"
          value={status}
          options={RECURRING_INVOICE_STATUS_OPTIONS}
        />
      }
      primaryLabel={showPrimary ? 'New' : undefined}
      primaryHref={showPrimary ? '/recurring-invoices/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
