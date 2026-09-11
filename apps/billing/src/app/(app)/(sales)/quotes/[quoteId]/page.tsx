import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/patterns/detail/detail-field'
import { MetricCard } from '@/components/patterns/metric-card'
import { resolveQuote } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { hasPermission } from '@/lib/auth/billing-context'
import { QuoteActions } from './_components/quote-actions'

interface Props {
  params: Promise<{ quoteId: string }>
}

function currentTimeSeconds(): number {
  return Math.floor(Date.now() / 1000)
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

  const isExpired =
    (quote.status === 'DRAFT' || quote.status === 'SENT') &&
    quote.expiresAt !== null &&
    quote.expiresAt <= currentTimeSeconds()

  return (
    <div className="space-y-6">
      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        isExpired={isExpired}
        convertedInvoiceId={quote.convertedInvoice?.id ?? null}
        canWrite={hasPermission(context, 'sales:write')}
      />
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
          <DetailField label="Sent" value={formatDate(quote.sentAt)} />
          <DetailField label="Accepted" value={formatDate(quote.acceptedAt)} />
          <DetailField label="Expired" value={formatDate(quote.expiredAt)} />
          <DetailField
            label="Converted invoice"
            value={quote.convertedInvoice?.number ?? 'Not converted'}
          />
          <DetailField label="Notes" value={quote.notes ?? '—'} />
          <DetailField label="Terms" value={quote.terms ?? '—'} />
          <DetailField label="Updated" value={formatDate(quote.updatedAt)} />
          <DetailField label="Quote ID" value={quote.id} mono />
        </dl>
      </section>
    </div>
  )
}
