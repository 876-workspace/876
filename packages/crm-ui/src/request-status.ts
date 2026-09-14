import { requestStatusSchema, type RequestStatus } from '@876/crm/contracts'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

const REQUEST_STATUSES: readonly RequestStatus[] = requestStatusSchema.options

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
): value is RequestStatus {
  return REQUEST_STATUSES.some((status) => status === value)
}
