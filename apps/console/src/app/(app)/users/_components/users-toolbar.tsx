import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { USER_STATUSES } from '@/lib/user-status'

const USER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Users' },
  ...USER_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    headingLabel: `${status.charAt(0).toUpperCase() + status.slice(1)} Users`,
  })),
]

const USERS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const },
  { label: 'Export', icon: 'export' as const },
  {
    label: 'Delete users',
    icon: 'delete' as const,
    destructive: true,
    separator: true,
  },
]

export function UsersToolbar({ status }: { status: string }) {
  return (
    <ResourceToolbar
      title="Users"
      titleFilter={
        <StatusFilterHeading
          label="Users"
          value={status}
          options={USER_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryHref="/users/new"
      primaryVariant="info"
      refresh
      dropdownActions={USERS_DROPDOWN_ACTIONS}
    />
  )
}
