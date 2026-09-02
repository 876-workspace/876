import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { CouponsList } from './coupons-list'

export async function CouponsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams
  const coupons = await service.discounts.coupons.list(
    context.tenant.id,
    undefined
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <CouponsList
        coupons={coupons}
        emptyState={
          <div className="876-card text-muted-foreground p-10 text-center text-sm">
            No coupons match this view.
          </div>
        }
      />
    </div>
  )
}
