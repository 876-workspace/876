import Link from 'next/link'
import { notFound } from 'next/navigation'

import { resolveCoupon } from '@/app/(app)/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'

export default async function CouponRedemptionsPage({
  params,
}: {
  params: Promise<{ couponId: string }>
}) {
  const { couponId } = await params
  const context = await requirePagePermission('subscriptions:read')
  const coupon = await resolveCoupon(context.tenant.id, couponId)
  if (!coupon) notFound()

  return (
    <section className="876-card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="876-section-title">Redemption ledger</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Append-only evidence used for limits, audits, and reporting.
        </p>
      </div>
      {coupon.redemptions.length ? (
        <div className="divide-y">
          {coupon.redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"
            >
              <div>
                <Link
                  href={`/customers/${redemption.customerId}`}
                  className="font-medium hover:underline"
                >
                  {redemption.customer.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {redemption.promotionCode?.code ?? 'Direct application'}
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {redemption.discountAmount !== null && redemption.currency
                  ? formatMoney(redemption.discountAmount, redemption.currency)
                  : `${coupon.percentOff?.toString() ?? 0}%`}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatDate(redemption.redeemedAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground p-10 text-center text-sm">
          No redemptions recorded.
        </p>
      )}
    </section>
  )
}
