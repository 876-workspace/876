import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { APP_STATUSES } from '@/lib/app-status'

const APP_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Apps' },
  ...APP_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Apps`,
  })),
]

export function AppsToolbar({ status }: { status: string }) {
  return (
    <ResourceToolbar
      title="Apps"
      titleFilter={
        <StatusFilterHeading
          label="Apps"
          value={status}
          options={APP_STATUS_OPTIONS}
        />
      }
      primaryLabel="New App"
      primaryHref="/apps/new"
      primaryVariant="info"
      refresh
    />
  )
}
