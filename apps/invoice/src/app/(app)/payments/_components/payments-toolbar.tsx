'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Payments', headingLabel: 'All Payments' },
]

export function PaymentsToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Payments Received"
      titleFilter={
        <StatusFilterHeading
          label="Payments Received"
          value={status}
          options={PAYMENT_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryIconOnly={!showPrimary}
      primaryHref="/payments/new"
      primaryVariant="info"
      refresh
    />
  )
}
