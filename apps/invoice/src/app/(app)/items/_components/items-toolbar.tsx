'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const ITEM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Items', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

export function ItemsToolbar({
  status,
  showPrimary,
}: {
  status: string
  /** The Add action belongs to the list view; a record on screen is the subject. */
  showPrimary: boolean
}) {
  return (
    <ResourceToolbar
      title="Items"
      titleFilter={
        <StatusFilterHeading
          label="Items"
          value={status}
          options={ITEM_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryIconOnly={!showPrimary}
      primaryHref="/items/new"
      primaryVariant="info"
      refresh
    />
  )
}
