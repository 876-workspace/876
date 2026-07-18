import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MetricCard } from '@/components/metric-card'
import { DetailField } from '@/components/detail-field'
import { DetailActionList } from '@/components/detail-action-list'
import { resolveSubscription } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney, formatPriceCadence } from '@/lib/format'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'

interface Props {
  params: Promise<{ subscriptionId: string }>
}

export const metadata: Metadata = {
  title: 'Subscription details',
  description: 'Commercial subscription details and lifecycle.',
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const { subscriptionId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const subscription = await resolveSubscription(
    context.tenant.id,
    subscriptionId
  )
  if (!subscription) notFound()

  const [row] = buildSubscriptionTableRows([subscription])
  if (!row) notFound()

  const currency = row.currency ?? context.tenant.defaultCurrency
  const base = `/subscriptions/${subscription.id}`
  const canManage = context.permissions.includes('subscriptions:write')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Recurring amount"
          value={formatMoney(row.amount, currency)}
          detail={formatPriceCadence({
            priceType: 'RECURRING',
            intervalUnit: row.intervalUnit,
            intervalCount: row.intervalCount,
          })}
        />
        <MetricCard
          label="Current period ends"
          value={formatDate(
            subscription.servicePeriodEnd ?? subscription.currentPeriodEnd
          )}
          detail={
            subscription.cancelAtPeriodEnd
              ? 'Cancels at period end'
              : 'Renews on this date'
          }
        />
        <MetricCard
          label="Invoices"
          value={subscription.invoices.length}
          detail="Documents linked to this agreement"
        />
      </div>

      <DetailActionList
        title="Subscription workspace"
        description="Review the agreement, then use the appropriate workflow for lifecycle or billing changes."
        actions={[
          ...(canManage
            ? [
                {
                  href: `${base}/manage`,
                  label: 'Manage lifecycle',
                  description:
                    'Pause, resume, cancel, reactivate, or extend this subscription.',
                },
                {
                  href: `${base}/edit`,
                  label: 'Change subscription',
                  description:
                    'Update items and commercial terms with proration controls.',
                },
                {
                  href: `${base}/billing`,
                  label: 'Billing adjustments',
                  description:
                    'Add one-time charges, discounts, coupons, and invoice preferences.',
                },
              ]
            : []),
          {
            href: `${base}/invoices`,
            label: 'Invoices',
            description:
              'Review draft, open, paid, and void documents for this agreement.',
            meta: subscription.invoices.length,
          },
        ]}
      />

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Agreement</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField
            label="Started"
            value={formatDate(subscription.startAt)}
          />
          <DetailField
            label="Trial ends"
            value={formatDate(subscription.trialEndsAt)}
          />
          <DetailField
            label="External reference"
            value={subscription.externalReference ?? '—'}
            mono
          />
          <DetailField label="Subscription ID" value={subscription.id} mono />
        </dl>
      </section>
    </div>
  )
}
