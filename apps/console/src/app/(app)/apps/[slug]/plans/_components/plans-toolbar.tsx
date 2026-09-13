'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

export function PlansToolbar({ slug }: { slug: string }) {
  return (
    <ResourceToolbar
      title="Plans"
      titleFilter={
        <StatusFilterHeading
          label="Plans"
          value="all"
          options={[{ value: 'all', label: 'All Plans' }]}
        />
      }
      primaryLabel="Add"
      primaryHref={`/apps/${slug}/plans/new`}
      primaryVariant="info"
      refresh
    />
  )
}
