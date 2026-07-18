import { notFound } from 'next/navigation'

import { resolveCoupon } from '@/app/(app)/detail-data'
import { CouponEditForm } from '@/components/coupon-edit-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ couponId: string }>
}) {
  const { couponId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const coupon = await resolveCoupon(context.tenant.id, couponId)
  if (!coupon) notFound()

  return (
    <CouponEditForm
      coupon={{
        id: coupon.id,
        name: coupon.name,
        redeemBy: coupon.redeemBy,
        maxRedemptions: coupon.maxRedemptions,
      }}
    />
  )
}
