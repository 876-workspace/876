'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const SALES_RECEIPT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Sales Receipts' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Sales Receipts' },
  { value: 'void', label: 'Void', headingLabel: 'Void Sales Receipts' },
]

export function SalesReceiptsToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Sales Receipts"
      titleFilter={
        <StatusFilterHeading
          label="Sales Receipts"
          value={status}
          options={SALES_RECEIPT_STATUS_OPTIONS}
        />
      }
      primaryLabel={showPrimary ? 'Add' : undefined}
      primaryHref={showPrimary ? '/sales-receipts/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
