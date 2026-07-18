import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { MetricCard } from '@/components/metric-card'
import { resolveQuote } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'

interface Props {
  params: Promise<{ quoteId: string }>
}

export const metadata: Metadata = {
  title: 'Quote details',
  description: 'Quote totals, customer, and line items.',
}

export default async function QuoteDetailPage({ params }: Props) {
  const { quoteId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const quote = await resolveQuote(context.tenant.id, quoteId)
  if (!quote) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Subtotal"
          value={formatMoney(quote.subtotalAmount, quote.currency)}
          detail={`${quote.lines.length} line item${quote.lines.length === 1 ? '' : 's'}`}
        />
        <MetricCard
          label="Tax"
          value={formatMoney(quote.taxAmount, quote.currency)}
          detail="Snapshotted tax amount"
        />
        <MetricCard
          label="Total"
          value={formatMoney(quote.totalAmount, quote.currency)}
          detail={quote.currency}
        />
      </div>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Quote information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Issued" value={formatDate(quote.issueAt)} />
          <DetailField label="Expires" value={formatDate(quote.expiresAt)} />
          <DetailField label="Accepted" value={formatDate(quote.acceptedAt)} />
          <DetailField label="Notes" value={quote.notes ?? '—'} />
          <DetailField label="Terms" value={quote.terms ?? '—'} />
          <DetailField label="Updated" value={formatDate(quote.updatedAt)} />
          <DetailField label="Quote ID" value={quote.id} mono />
        </dl>
      </section>
    </div>
  )
}
