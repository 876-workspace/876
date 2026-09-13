import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

import { formatDate, formatMoney } from '@/lib/finance/format'

import { resolveInvoice } from '../_lib/invoice-data'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function InvoiceOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<InvoiceOverviewFallback />}>
      <InvoiceOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function InvoiceOverviewFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function factValue(value: string | null) {
  return value || <span className="text-muted-foreground">&mdash;</span>
}

async function InvoiceOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const invoice = await resolveInvoice(orgSlug, id)
  if (!invoice) notFound()

  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
          <DetailCardFact
            label="Customer"
            value={factValue(invoice.customer?.name ?? invoice.customerId)}
          />
          <DetailCardFact label="Status" value={factValue(invoice.status)} />
          <DetailCardFact
            label="Issued"
            value={factValue(formatDate(invoice.issueAt))}
          />
          <DetailCardFact
            label="Due"
            value={factValue(formatDate(invoice.dueAt))}
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Amounts">
        <DetailCardFacts>
          <DetailCardFact
            label="Subtotal"
            value={formatMoney(invoice.subtotalAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Tax"
            value={formatMoney(invoice.taxAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Total"
            value={formatMoney(invoice.totalAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Amount due"
            value={formatMoney(invoice.amountDue, invoice.currency)}
          />
          <DetailCardFact
            label="Amount paid"
            value={formatMoney(invoice.amountPaid, invoice.currency)}
          />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}
