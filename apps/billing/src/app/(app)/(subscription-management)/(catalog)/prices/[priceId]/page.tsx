import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { MetricCard } from '@/components/metric-card'
import { resolvePrice } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney, formatPriceCadence } from '@/lib/format'

interface Props {
  params: Promise<{ priceId: string }>
}

export const metadata: Metadata = {
  title: 'Price details',
  description: 'Immutable price configuration and usage.',
}

export default async function PriceDetailPage({ params }: Props) {
  const { priceId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const price = await resolvePrice(context.tenant.id, priceId)
  if (!price) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Amount"
          value={formatMoney(price.unitAmount, price.currency)}
          detail={formatPriceCadence(price)}
        />
        <MetricCard
          label="Subscriptions"
          value={price._count.subscriptionItems}
          detail="Agreements using this price"
        />
        <MetricCard
          label="Documents"
          value={price._count.quoteLines + price._count.invoiceLines}
          detail={`${price._count.quoteLines} quotes, ${price._count.invoiceLines} invoices`}
        />
      </div>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Price information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Currency" value={price.currency} />
          <DetailField
            label="Pricing model"
            value={price.pricingModel.toLowerCase().replaceAll('_', ' ')}
          />
          <DetailField
            label="Price type"
            value={price.priceType.toLowerCase().replaceAll('_', ' ')}
          />
          <DetailField label="Unit name" value={price.unitName ?? '—'} />
          <DetailField
            label="Package size"
            value={price.packageSize?.toString() ?? '—'}
          />
          <DetailField
            label="Tax"
            value={price.isTaxable ? 'Taxable' : 'Non-taxable'}
          />
          <DetailField
            label="Entitlement reference"
            value={price.entitlementReferenceId ?? '—'}
            mono
          />
          <DetailField label="Created" value={formatDate(price.createdAt)} />
          <DetailField label="Price ID" value={price.id} mono />
        </dl>
      </section>
    </div>
  )
}
