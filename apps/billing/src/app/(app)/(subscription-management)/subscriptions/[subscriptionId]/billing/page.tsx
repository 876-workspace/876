import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { SubscriptionInvoiceActions } from '@/components/subscription-invoice-actions'
import { SubscriptionBillingItemAction } from '@/components/subscription-billing-item-action'

export default async function SubscriptionBillingPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const subscription = await resolveSubscription(
    context.tenant.id,
    subscriptionId
  )
  if (!subscription) notFound()
  const currency =
    subscription.items.find((item) => item.currency)?.currency ??
    context.tenant.defaultCurrency
  const canManage = context.permissions.includes('subscriptions:write')

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {subscription.status === 'ACTIVE' ? (
            <SubscriptionInvoiceActions subscriptionId={subscriptionId} />
          ) : null}
          <Link
            href={`/subscriptions/${subscriptionId}/discounts/new`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Apply discount
          </Link>
          <Link
            href={`/subscriptions/${subscriptionId}/charges/new`}
            className={buttonVariants({ variant: 'info' })}
          >
            Add charge
          </Link>
        </div>
      ) : null}
      <Section
        title="One-time charges"
        empty="No one-time charges have been added."
      >
        {subscription.charges.map((charge) => (
          <Row
            key={charge.id}
            title={charge.description}
            detail={`${charge.quantity} × ${formatMoney(charge.unitAmount.toString(), charge.currency)}`}
            right={
              <div className="text-right">
                <Badge
                  variant={
                    charge.status === 'INVOICED'
                      ? 'success'
                      : charge.status === 'VOID'
                        ? 'secondary'
                        : 'warning'
                  }
                >
                  {charge.status.toLowerCase()}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">
                  {charge.invoiceBehavior === 'NEXT_INVOICE'
                    ? 'Next invoice'
                    : 'Immediate invoice'}
                </p>
                {canManage && charge.status === 'UNBILLED' ? (
                  <SubscriptionBillingItemAction
                    subscriptionId={subscriptionId}
                    resourceId={charge.id}
                    kind="charge"
                  />
                ) : null}
              </div>
            }
          />
        ))}
      </Section>
      <Section title="Discounts and coupons" empty="No discounts are attached.">
        {subscription.discounts.map((discount) => (
          <Row
            key={discount.id}
            title={discount.coupon?.name ?? 'Manual discount'}
            detail={
              discount.promotionCode?.code ??
              discount.grantReason ??
              `${discount.scope.toLowerCase()} discount`
            }
            right={
              <div className="text-right">
                <Badge
                  variant={
                    discount.status === 'ACTIVE' ? 'success' : 'secondary'
                  }
                >
                  {discount.status.toLowerCase()}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">
                  {discount.discountType === 'PERCENTAGE'
                    ? `${discount.percentOff?.toString() ?? '0'}%`
                    : formatMoney(
                        discount.amountOff?.toString(),
                        discount.currency ?? currency
                      )}
                </p>
                {canManage && discount.status === 'ACTIVE' ? (
                  <SubscriptionBillingItemAction
                    subscriptionId={subscriptionId}
                    resourceId={discount.id}
                    kind="discount"
                  />
                ) : null}
              </div>
            }
          />
        ))}
      </Section>
      <Section
        title="Scheduled lifecycle actions"
        empty="No lifecycle actions have been scheduled."
      >
        {subscription.lifecycleSchedules.map((schedule) => (
          <Row
            key={schedule.id}
            title={schedule.action.toLowerCase()}
            detail={schedule.reason ?? 'No reason recorded'}
            right={
              <div className="text-right">
                <Badge
                  variant={
                    schedule.status === 'SCHEDULED'
                      ? 'warning'
                      : schedule.status === 'APPLIED'
                        ? 'success'
                        : 'secondary'
                  }
                >
                  {schedule.status.toLowerCase()}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(schedule.effectiveAt)}
                </p>
              </div>
            }
          />
        ))}
      </Section>
      <Section
        title="Subscription changes"
        empty="No item or commercial-term changes have been requested."
      >
        {subscription.amendments.map((amendment) => (
          <Row
            key={amendment.id}
            title={`${amendment.items.length} item${amendment.items.length === 1 ? '' : 's'} · ${amendment.timing.toLowerCase().replaceAll('_', ' ')}`}
            detail={
              amendment.reason ??
              amendment.prorationBehavior.toLowerCase().replaceAll('_', ' ')
            }
            right={
              <div className="text-right">
                <Badge
                  variant={
                    amendment.status === 'APPLIED'
                      ? 'success'
                      : amendment.status === 'PENDING'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {amendment.status.toLowerCase()}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(amendment.effectiveAt)}
                </p>
              </div>
            }
          />
        ))}
      </Section>
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode[]
}) {
  return (
    <section className="876-card overflow-hidden">
      <div className="border-border border-b px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children.length ? (
        <div className="divide-border divide-y">{children}</div>
      ) : (
        <p className="text-muted-foreground px-5 py-10 text-center text-sm">
          {empty}
        </p>
      )}
    </section>
  )
}
function Row({
  title,
  detail,
  right,
}: {
  title: string
  detail: string
  right: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="font-medium capitalize">{title}</p>
        <p className="text-muted-foreground mt-1 truncate text-xs">{detail}</p>
      </div>
      {right}
    </div>
  )
}
