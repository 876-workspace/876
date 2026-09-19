import type { ReactNode } from 'react'
import { AppError } from '@876/ui/app-error'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CircleStackIcon } from '@876/ui/icons'
import { billingIntegration } from '@/lib/clients/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { ItemsList } from './items-list'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. Every shared-catalog item is loaded; the
 * status filter is applied by `ItemsList`, because a layout receives no
 * `searchParams`.
 */
export async function ItemsListData({ orgSlug }: { orgSlug: string }) {
  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleStackIcon />
        </EmptyMedia>
        <EmptyTitle>No items</EmptyTitle>
        <EmptyDescription>
          No shared catalog items in this finance workspace yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <ItemsListColumn>
        <ItemsList items={[]} orgSlug={orgSlug} emptyState={emptyState} />
      </ItemsListColumn>
    )

  const items = await billingIntegration.items.list(ctx.orgId)

  const isMissingWorkspace =
    items.error?.code === 'billing/tenant-not-found' ||
    items.error?.code === 'billing/database-not-ready' ||
    items.error?.code === 'billing/unreachable'

  const displayError = items.error && !isMissingWorkspace ? items.error : null

  const rows = items.error ? [] : items.data.data

  return (
    <ItemsListColumn>
      {displayError ? (
        <AppError
          title="Items could not be loaded"
          error={displayError}
          variant="banner"
        />
      ) : null}

      <ItemsList items={rows} orgSlug={orgSlug} emptyState={emptyState} />
    </ItemsListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function ItemsListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
