import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { resolveCoupon } from '@/app/(app)/detail-data'
import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { DetailLayout } from '@/components/detail-layout'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function CouponDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ couponId: string }>
}) {
  const { couponId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const coupon = await resolveCoupon(context.tenant.id, couponId)
  if (!coupon) notFound()
  const base = `/coupons/${coupon.id}`

  return (
    <DetailLayout
      backHref="/coupons"
      backLabel="Coupons"
      eyebrow={coupon.product?.name ?? 'Subscription discount'}
      title={coupon.name}
      description={
        coupon.promotionCodes
          .filter((code) => code.isActive)
          .map((code) => code.code)
          .join(', ') || 'No active promotion code'
      }
      status={coupon.isActive ? 'active' : 'archived'}
      statusVariant={coupon.isActive ? 'success' : 'secondary'}
      actions={
        context.permissions.includes('subscriptions:write') ? (
          <CatalogResourceActions
            resource="coupon"
            resourceId={coupon.id}
            resourceName={coupon.name}
            isActive={coupon.isActive}
            returnHref="/coupons"
            editHref={`/coupons/${coupon.id}/edit`}
          />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Redemptions', href: `${base}/redemptions` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
