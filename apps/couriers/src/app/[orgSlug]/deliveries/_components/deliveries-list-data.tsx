import type { ReactNode } from 'react'

import { DeliveriesList } from './deliveries-list'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. There is no deliveries retrieve yet, so
 * the list renders the rows it is given; the status filter is applied by
 * `DeliveriesList`, because a layout receives no `searchParams`.
 */
export async function DeliveriesListData({ orgSlug }: { orgSlug: string }) {
  return (
    <DeliveriesListColumn>
      <DeliveriesList deliveries={[]} orgSlug={orgSlug} />
    </DeliveriesListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function DeliveriesListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
