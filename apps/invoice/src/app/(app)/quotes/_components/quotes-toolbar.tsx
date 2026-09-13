'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const QUOTE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Quotes', headingLabel: 'All Quotes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Quotes' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Quotes' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Quotes' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Quotes' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Quotes' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Quotes' },
]

export function QuotesToolbar({
  status,
  showPrimary,
}: {
  status: string
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Quotes"
      titleFilter={
        <StatusFilterHeading
          label="Quotes"
          value={status}
          options={QUOTE_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryIconOnly={!showPrimary}
      primaryHref="/quotes/new"
      primaryVariant="info"
      refresh
    />
  )
}
