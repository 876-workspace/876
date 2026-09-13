import type { ReactNode } from 'react'

import { DisputesList } from './disputes-list'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. There is no disputes retrieve yet, so the
 * list renders the rows it is given.
 */
export async function DisputesListData({ orgSlug }: { orgSlug: string }) {
  return (
    <DisputesListColumn>
      <DisputesList disputes={[]} orgSlug={orgSlug} />
    </DisputesListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function DisputesListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
