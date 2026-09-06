'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const INVOICE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

export function InvoicesToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Invoices"
      titleFilter={
        <StatusFilterHeading
          label="Invoices"
          value={status}
          options={INVOICE_STATUS_OPTIONS}
        />
      }
      primaryLabel={showPrimary ? 'Add' : undefined}
      primaryHref={showPrimary ? '/invoices/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
