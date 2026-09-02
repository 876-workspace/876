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
import { ReceiptText } from '@876/ui/icons'

import { getInvoiceContext } from '@/lib/auth/context'
import { listInvoices } from '@/app/(app)/_lib/list-data'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

type Props = { params: Promise<{ salesReceiptId: string }> }

export const metadata = {
  title: 'Sales Receipt',
  description: 'Sales receipt details.',
}

export default async function SalesReceiptDetailPage({ params }: Props) {
  const { salesReceiptId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = await listInvoices(context.orgId)
  if (result.error) {
    return (
      <DetailCard aria-label="Sales receipt unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Sales receipt details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const receipt = result.data.data.find((row) => row.id === salesReceiptId)
  if (!receipt) notFound()

  const customer =
    receipt.customer &&
    typeof receipt.customer === 'object' &&
    'name' in receipt.customer
      ? String(receipt.customer.name ?? '—')
      : String(receipt.customerName ?? '—')
  const number = String(receipt.number ?? receipt.id)
  const totalAmount = String(receipt.totalAmount ?? '0')
  const currency = String(receipt.currency ?? 'JMD')
  const status = String(receipt.status ?? 'PAID')
  const date =
    typeof receipt.createdAt === 'number'
      ? receipt.createdAt
      : typeof receipt.date === 'number'
        ? receipt.date
        : null

  return (
    <DetailCard aria-label={`Sales receipt details: ${number}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <ReceiptText className="size-5" />
          </DetailCardIcon>
        }
        title={number}
        meta={
          <Badge variant={documentStatusVariant(status)}>
            {status.toLowerCase().replace(/_/g, ' ')}
          </Badge>
        }
        subtitle={customer}
        closeHref="/sales-receipts"
        closeLabel="Close sales receipt details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(totalAmount, currency)}
          caption="Sales receipt total"
        />
        <DetailCardSection title="Sales receipt">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={customer} />
            <DetailCardFact label="Date" value={formatDate(date)} />
            <DetailCardFact label="Currency" value={currency} mono />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{receipt.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
