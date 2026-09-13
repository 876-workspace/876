import type { ReactNode } from 'react'

import { ManifestList } from './manifest-list'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. There is no manifest retrieve yet, so the
 * list renders the rows it is given; the status filter is applied by
 * `ManifestList`, because a layout receives no `searchParams`.
 */
export async function ManifestListData({ orgSlug }: { orgSlug: string }) {
  return (
    <ManifestListColumn>
      <ManifestList manifests={[]} orgSlug={orgSlug} />
    </ManifestListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function ManifestListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
