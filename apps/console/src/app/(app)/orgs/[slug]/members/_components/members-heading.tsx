'use client'

import { useSearchParams } from 'next/navigation'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

const MEMBER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Members' },
  { value: 'active', label: 'Active', headingLabel: 'Active Members' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Members' },
  { value: 'suspended', label: 'Suspended', headingLabel: 'Suspended Members' },
]

export function MembersHeading() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status') ?? 'all'
  const selectedStatus = MEMBER_STATUS_OPTIONS.some(
    (item) => item.value === statusParam
  )
    ? statusParam
    : 'all'

  return (
    <StatusFilterHeading
      label="Members"
      value={selectedStatus}
      options={MEMBER_STATUS_OPTIONS}
    />
  )
}
