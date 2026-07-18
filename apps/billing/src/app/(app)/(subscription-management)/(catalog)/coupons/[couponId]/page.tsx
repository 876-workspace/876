import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'

import { resolveCoupon } from '@/app/(app)/detail-data'
import { DetailField } from '@/components/detail-field'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'

export default async function CouponOverviewPage({
  params,
}: {
  params: Promise<{ couponId: string }>
}) {
  const { couponId } = await params
  const context = await requirePagePermission('subscriptions:read')
  const coupon = await resolveCoupon(context.tenant.id, couponId)
  if (!coupon) notFound()

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Discount</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField
            label="Value"
            value={
              coupon.percentOff !== null
                ? `${coupon.percentOff.toString()}%`
                : coupon.amountOff !== null && coupon.currency
                  ? formatMoney(coupon.amountOff, coupon.currency)
                  : `${coupon.currencyAmounts.length} currency amounts`
            }
          />
          <DetailField
            label="Duration"
            value={
              coupon.duration === 'REPEATING'
                ? `${coupon.durationInCycles ?? 0} billing cycles`
                : coupon.duration.toLowerCase()
            }
          />
          <DetailField
            label="Application"
            value={
              coupon.discountPreference === 'ITEM_LEVEL'
                ? 'Eligible items'
                : 'Invoice total'
            }
          />
          <DetailField
            label="Expires"
            value={coupon.redeemBy ? formatDate(coupon.redeemBy) : 'Never'}
          />
          <DetailField
            label="Redemption limits"
            value={`${coupon.timesRedeemed}${coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''} total · ${coupon.maxRedemptionsPerCustomer ?? 'Unlimited'} per customer`}
          />
        </dl>
      </section>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Applicability</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField
            label="Plans"
            value={
              coupon.appliesToAllPlans
                ? 'All plans'
                : coupon.planApplicabilities
                    .map(({ plan }) => plan.name)
                    .join(', ') || 'None'
            }
          />
          <DetailField
            label="Recurring add-ons"
            value={coupon.appliesToAllRecurringAddons ? 'All' : 'Selected only'}
          />
          <DetailField
            label="One-time add-ons"
            value={coupon.appliesToAllOneTimeAddons ? 'All' : 'Selected only'}
          />
          <DetailField
            label="Selected add-ons"
            value={
              coupon.addonApplicabilities
                .map(({ addon }) => addon.name)
                .join(', ') || 'None'
            }
          />
          <DetailField
            label="Customers"
            value={
              coupon.eligibleForAllCustomers
                ? 'All customers'
                : `${coupon.customerEligibilities.length} selected`
            }
          />
        </dl>
      </section>

      <section className="876-card overflow-hidden lg:col-span-2">
        <div className="border-b px-5 py-4">
          <h2 className="876-section-title">Promotion codes</h2>
        </div>
        {coupon.promotionCodes.length ? (
          <div className="divide-y">
            {coupon.promotionCodes.map((code) => (
              <div key={code.id} className="flex items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1 font-mono font-medium">
                  {code.code}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {code.timesRedeemed}
                  {code.maxRedemptions ? ` / ${code.maxRedemptions}` : ''}{' '}
                  redeemed
                </span>
                <Badge variant={code.isActive ? 'info' : 'secondary'}>
                  {code.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground p-5 text-sm">
            This coupon has no customer-facing codes.
          </p>
        )}
      </section>
    </div>
  )
}
