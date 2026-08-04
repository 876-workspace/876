import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { ORG_STATUSES } from '@/lib/org-status'

const ORG_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Organizations' },
  ...ORG_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Organizations`,
  })),
]

const ORGS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const },
  { label: 'Export', icon: 'export' as const },
  {
    label: 'Delete organizations',
    icon: 'delete' as const,
    destructive: true,
    separator: true,
  },
]

export function OrgsToolbar({ status }: { status: string }) {
  return (
    <ResourceToolbar
      title="Organizations"
      titleFilter={
        <StatusFilterHeading
          label="Organizations"
          value={status}
          options={ORG_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryHref="/org/new"
      primaryVariant="info"
      refresh
      dropdownActions={ORGS_DROPDOWN_ACTIONS}
    />
  )
}
