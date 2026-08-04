import { after } from 'next/server'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

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

  const { id: tenantId, orgId } = ctx.tenant

  const branches = await service.branches.list({ tenantId })

  // Opportunistic repair for sites whose core mirror failed at write time. It
  // runs after the response so a slow identity API never delays this page.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

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
