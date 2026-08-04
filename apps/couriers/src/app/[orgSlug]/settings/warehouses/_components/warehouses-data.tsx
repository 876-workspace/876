import { after } from 'next/server'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { WarehousesCards } from './warehouses-cards'

type Props = { params: Promise<{ orgSlug: string }> }

export async function WarehousesData({ params }: Props) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s warehouses. Please try
        again.
      </div>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const warehouses = await service.warehouses.list({ tenantId })

  // The warehouse form redirects here, so a warehouse whose core mirror failed
  // would otherwise stay unlinked no matter how often this list is refreshed.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <WarehousesCards
      warehouses={warehouses}
      orgSlug={orgSlug}
      emptyState={
        <div className="876-empty-dashed max-w-2xl">No warehouses yet.</div>
      }
    />
  )
}
