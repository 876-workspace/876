import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData, toBranchView } from '@/lib/couriers'
import { $876 } from '@/lib/876'

import { LocationsCards } from './locations-cards'

type Props = { params: Promise<{ orgSlug: string }> }

export async function LocationsData({ params }: Props) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s branches. Please try
        again.
      </div>
    )

  const { id: tenantId } = ctx.tenant

  const branches = requireCouriersData(
    await $876.couriers.branches.list(tenantId)
  ).data.map(toBranchView)

  return (
    <LocationsCards
      branches={branches}
      orgSlug={orgSlug}
      emptyState={
        <div className="876-empty-dashed max-w-2xl">No branches yet.</div>
      }
    />
  )
}
