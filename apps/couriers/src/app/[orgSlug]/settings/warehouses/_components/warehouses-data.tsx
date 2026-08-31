import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData, toWarehouseView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'

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

  const $876 = await getCouriers()

  const warehouses = requireCouriersData(await $876.warehouses.list()).data.map(
    toWarehouseView
  )

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
