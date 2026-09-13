import type { ReactNode } from 'react'

import { PreAlertsList } from './pre-alerts-list'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. There is no pre-alerts retrieve yet, so
 * the list renders the rows it is given; the status filter is applied by
 * `PreAlertsList`, because a layout receives no `searchParams`.
 */
export async function PreAlertsListData({ orgSlug }: { orgSlug: string }) {
  return (
    <PreAlertsListColumn>
      <PreAlertsList preAlerts={[]} orgSlug={orgSlug} />
    </PreAlertsListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function PreAlertsListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
