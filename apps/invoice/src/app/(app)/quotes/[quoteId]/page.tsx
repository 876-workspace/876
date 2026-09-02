import { notFound, redirect } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIcon,
  DetailCardIdBar,
  DetailCardSection,
} from '@876/ui/detail-card'
import { ClipboardList } from '@876/ui/icons'

import { getInvoiceContext } from '@/lib/auth/context'
import { listQuotes } from '@/app/(app)/_lib/list-data'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

type Props = { params: Promise<{ quoteId: string }> }

export const metadata = {
  title: 'Quote',
  description: 'Quote details.',
}

export default async function QuoteDetailPage({ params }: Props) {
  const { quoteId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = await listQuotes(context.orgId)
  if (result.error) {
    return (
      <DetailCard aria-label="Quote unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Quote details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const quote = result.data.data.find((row) => row.id === quoteId)
  if (!quote) notFound()

  const customer =
    quote.customer &&
    typeof quote.customer === 'object' &&
    'name' in quote.customer
      ? String(quote.customer.name ?? '—')
      : String(quote.customerName ?? '—')
  const number = String(quote.number ?? quote.id)
  const totalAmount = String(quote.totalAmount ?? quote.amount ?? '0')
  const currency = String(quote.currency ?? 'JMD')
  const status = String(quote.status ?? 'DRAFT')
  const convertedInvoice =
    quote.convertedInvoice &&
    typeof quote.convertedInvoice === 'object' &&
    'number' in quote.convertedInvoice
      ? String(quote.convertedInvoice.number)
      : null
  const date =
    typeof quote.issueAt === 'number'
      ? quote.issueAt
      : typeof quote.createdAt === 'number'
        ? quote.createdAt
        : null

  return (
    <DetailCard aria-label={`Quote details: ${number}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <ClipboardList className="size-5" />
          </DetailCardIcon>
        }
        title={number}
        meta={
          <Badge variant={documentStatusVariant(status)}>
            {status.toLowerCase().replace(/_/g, ' ')}
          </Badge>
        }
        subtitle={customer}
        closeHref="/quotes"
        closeLabel="Close quote details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(totalAmount, currency)}
          caption="Quote total"
        />
        <DetailCardSection title="Quote">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={customer} />
            <DetailCardFact label="Date" value={formatDate(date)} />
            <DetailCardFact label="Currency" value={currency} mono />
            <DetailCardFact
              label="Converted invoice"
              value={convertedInvoice ?? 'Not converted'}
            />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{quote.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
