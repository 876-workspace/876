'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

export function SubscribersToolbar() {
  return (
    <ResourceToolbar
      title="Subscribers"
      titleFilter={
        <StatusFilterHeading
          label="Subscribers"
          value="all"
          options={[{ value: 'all', label: 'All Subscribers' }]}
        />
      }
      refresh
    />
  )
}
