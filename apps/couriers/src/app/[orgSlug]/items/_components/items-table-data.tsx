import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CircleStackIcon } from '@876/ui/icons'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { ItemsList } from './items-list'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function ItemsTableData({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'
  const activeFilter =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No shared catalog items in this finance workspace yet.'
      : `No ${selectedStatus} items.`

  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleStackIcon />
        </EmptyMedia>
        <EmptyTitle>No items</EmptyTitle>
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return <ItemsList items={[]} orgSlug={orgSlug} emptyState={emptyState} />

  const items = await billingIntegration.items.list(ctx.orgId, {
    active: activeFilter,
  })

  const isMissingWorkspace =
    items.error?.code === 'billing/tenant-not-found' ||
    items.error?.code === 'billing/database-not-ready' ||
    items.error?.code === 'billing/unreachable'

  const displayError = items.error && !isMissingWorkspace ? items.error : null

  const rows = items.error ? [] : items.data.data

  return (
    <>
      {displayError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-[0.8125rem]">
          {displayError.message}
        </div>
      ) : null}

      <ItemsList items={rows} orgSlug={orgSlug} emptyState={emptyState} />
    </>
  )
}
