'use client'

import { ResourceToolbar } from '@876/ui/resource-toolbar'

export function FeaturesToolbar({ slug }: { slug: string }) {
  return (
    <ResourceToolbar
      title="Feature Flags"
      primaryLabel="Create feature"
      primaryHref={`/apps/${slug}/features/new`}
      primaryVariant="info"
      refresh
    />
  )
}
