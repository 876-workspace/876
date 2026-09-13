'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

export function FeaturesToolbar({ slug }: { slug: string }) {
  return (
    <ResourceToolbar
      title="Feature Flags"
      titleFilter={
        <StatusFilterHeading
          label="Feature Flags"
          value="all"
          options={[{ value: 'all', label: 'All Feature Flags' }]}
        />
      }
      primaryLabel="Add"
      primaryHref={`/apps/${slug}/features/new`}
      primaryVariant="info"
      refresh
    />
  )
}
