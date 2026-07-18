import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { MetricCard } from '@/components/metric-card'
import { resolvePlan } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney, formatPriceCadence } from '@/lib/format'

interface Props {
  params: Promise<{ planId: string }>
}

export const metadata: Metadata = {
  title: 'Plan details',
  description: 'Subscription plan cadence and pricing.',
}

export default async function PlanDetailPage({ params }: Props) {
  const { planId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const plan = await resolvePlan(context.tenant.id, planId)
  if (!plan) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Cadence"
          value={formatPriceCadence({
            priceType: 'RECURRING',
            intervalUnit: plan.intervalUnit,
            intervalCount: plan.intervalCount,
          })}
          detail="Billing interval"
        />
        <MetricCard
          label="Prices"
          value={plan._count.prices}
          detail="Currency-specific prices"
        />
        <MetricCard
          label="Trial"
          value={plan.trialDays ? `${plan.trialDays} days` : 'None'}
          detail="Free trial period"
        />
      </div>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Plan information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Code" value={plan.code} mono />
          <DetailField
            label="Plan type"
            value={plan.isFree ? 'Free plan' : 'Paid plan'}
          />
          <DetailField
            label="Checkout"
            value={plan.showInCheckout ? 'Visible' : 'Hidden'}
          />
          <DetailField label="Unit" value={plan.unitName ?? '—'} />
          <DetailField
            label="Billing cycles"
            value={plan.billingCycleCount?.toString() ?? 'Unlimited'}
          />
          <DetailField
            label="Setup fee"
            value={
              plan.setupFeeCurrency
                ? formatMoney(plan.setupFeeAmount, plan.setupFeeCurrency)
                : 'None'
            }
          />
          <DetailField
            label="Tax"
            value={plan.isTaxable ? 'Taxable' : 'Non-taxable'}
          />
          <DetailField
            label="Entitlement reference"
            value={plan.entitlementReferenceId ?? '—'}
            mono
          />
          <DetailField label="Updated" value={formatDate(plan.updatedAt)} />
          <DetailField label="Plan ID" value={plan.id} mono />
        </dl>
      </section>
    </div>
  )
}
