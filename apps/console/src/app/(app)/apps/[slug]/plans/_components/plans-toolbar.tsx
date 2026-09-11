'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'

export function PlansToolbar({ slug }: { slug: string }) {
  return (
    <ResourceToolbar
      title="Plans"
      primaryLabel="Add plan"
      primaryHref={`/apps/${slug}/plans/new`}
      primaryVariant="info"
    />
  )
}
