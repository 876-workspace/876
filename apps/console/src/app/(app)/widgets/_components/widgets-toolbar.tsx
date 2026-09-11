'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const DISTRIBUTION_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All widgets', headingLabel: 'Widgets' },
  { value: 'shared', label: 'Shared widgets' },
  { value: 'host', label: 'App-only widgets' },
]

export function WidgetsToolbar({ distribution }: { distribution: string }) {
  return (
    <ResourceToolbar
      title="Widgets"
      titleFilter={
        <StatusFilterHeading
          label="Widgets"
          value={distribution}
          options={DISTRIBUTION_OPTIONS}
          paramKey="distribution"
        />
      }
      primaryLabel="Add"
      primaryHref="/widgets/new"
      primaryVariant="info"
      refresh
    />
  )
}
