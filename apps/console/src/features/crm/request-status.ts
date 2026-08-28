import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import type { CrmRequestStatus } from '@/types/crm'

const REQUEST_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
] as const satisfies readonly CrmRequestStatus[]

export const REQUEST_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Requests' },
  { value: 'OPEN', label: 'Open', headingLabel: 'Open Requests' },
  {
    value: 'IN_PROGRESS',
    label: 'In progress',
    headingLabel: 'In-progress Requests',
  },
  { value: 'WAITING', label: 'Waiting', headingLabel: 'Waiting Requests' },
  { value: 'RESOLVED', label: 'Resolved', headingLabel: 'Resolved Requests' },
  { value: 'CLOSED', label: 'Closed', headingLabel: 'Closed Requests' },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    headingLabel: 'Cancelled Requests',
  },
]

export function isRequestStatus(
  value: string | undefined
): value is CrmRequestStatus {
  return REQUEST_STATUSES.some((status) => status === value)
}
