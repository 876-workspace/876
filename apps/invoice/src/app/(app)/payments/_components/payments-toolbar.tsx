'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
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
      primaryLabel={showPrimary ? 'Add' : undefined}
      primaryHref={showPrimary ? '/payments/new' : undefined}
      primaryVariant="info"
      refresh
    />
  )
}
