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
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { listQuotes } from '@/app/(app)/_lib/list-data'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

import { QuoteActions } from './_components/quote-actions'

type Props = { params: Promise<{ quoteId: string }> }

function currentTimeSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

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
  const access = await resolveAccessContext(context.userId, context.orgId)

  const convertedInvoice =
    quote.convertedInvoice && typeof quote.convertedInvoice === 'object'
      ? quote.convertedInvoice
      : null
  const convertedInvoiceId =
    convertedInvoice && 'id' in convertedInvoice
      ? String(convertedInvoice.id)
      : null
  const convertedInvoiceNumber =
    convertedInvoice && 'number' in convertedInvoice
      ? String(convertedInvoice.number)
      : null
  const canWrite =
    access.status === 'ok' && canAccess(access.context, 'quotes.edit')
  const canDelete =
    access.status === 'ok' && canAccess(access.context, 'quotes.delete')
  const canConvert =
    convertedInvoiceId === null &&
    access.status === 'ok' &&
    canAccess(access.context, 'invoices.create')

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
  const date =
    typeof quote.issueAt === 'number'
      ? quote.issueAt
      : typeof quote.createdAt === 'number'
        ? quote.createdAt
        : null
  const expiresAt = typeof quote.expiresAt === 'number' ? quote.expiresAt : null
  const isExpired =
    (status === 'DRAFT' || status === 'SENT') &&
    expiresAt !== null &&
    expiresAt <= currentTimeSeconds()
  const sentAt = typeof quote.sentAt === 'number' ? quote.sentAt : null
  const acceptedAt =
    typeof quote.acceptedAt === 'number' ? quote.acceptedAt : null
  const expiredAt = typeof quote.expiredAt === 'number' ? quote.expiredAt : null

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
      <div className="px-5 pt-5 sm:px-6 print:hidden">
        <QuoteActions
          quoteId={quote.id}
          status={status as Parameters<typeof QuoteActions>[0]['status']}
          isExpired={isExpired}
          canWrite={canWrite}
          canDelete={canDelete}
          canConvert={canConvert}
          convertedInvoiceId={convertedInvoiceId}
        />
      </div>
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(totalAmount, currency)}
          caption="Quote total"
        />
        <DetailCardSection title="Quote">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={customer} />
            <DetailCardFact label="Date" value={formatDate(date)} />
            <DetailCardFact label="Expires" value={formatDate(expiresAt)} />
            <DetailCardFact label="Sent" value={formatDate(sentAt)} />
            <DetailCardFact label="Accepted" value={formatDate(acceptedAt)} />
            <DetailCardFact label="Expired" value={formatDate(expiredAt)} />
            <DetailCardFact label="Currency" value={currency} mono />
            <DetailCardFact
              label="Converted invoice"
              value={convertedInvoiceNumber ?? 'Not converted'}
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
