import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { resolveQuote } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'

export default async function QuoteDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ quoteId: string }>
}) {
  const { quoteId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const quote = await resolveQuote(context.tenant.id, quoteId)
  if (!quote) notFound()

  const base = `/quotes/${quote.id}`

  return (
    <DetailLayout
      backHref="/quotes"
      backLabel="Quotes"
      eyebrow="Sales quote"
      title={quote.number}
      description={`${quote.customer.name} · ${formatMoney(quote.totalAmount, quote.currency)}`}
      status={quote.status.toLowerCase()}
      statusVariant={quote.status === 'ACCEPTED' ? 'success' : 'secondary'}
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Line items', href: `${base}/lines` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
