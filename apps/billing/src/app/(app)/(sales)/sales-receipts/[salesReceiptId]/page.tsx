import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
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

import {
  getWorkspaceContext,
  hasPermission,
} from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'
import { documentStatusVariant } from '@/lib/status'

type Props = { params: Promise<{ salesReceiptId: string }> }

export const metadata = {
  title: 'Sales Receipt',
  description: 'Sales receipt details.',
}

export default async function SalesReceiptDetailPage({ params }: Props) {
  const { salesReceiptId } = await params
  const billing = await getBilling()
  const [result, context] = await Promise.all([
    billing.salesReceipts.retrieve(salesReceiptId),
    getWorkspaceContext(),
  ])
  if (result.error) {
    if (result.error.code === 'sales-receipt/not-found') notFound()
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

  const receipt = result.data
  const customer =
    receipt.customer &&
    typeof receipt.customer === 'object' &&
    'name' in receipt.customer
      ? String(receipt.customer.name ?? '—')
      : typeof receipt.customerName === 'string'
        ? receipt.customerName
        : '—'
  const canRefund =
    receipt.status === 'PAID' &&
    BigInt(receipt.refundableAmount) > 0n &&
    context !== null &&
    hasPermission(context, 'sales:write')

  return (
    <DetailCard aria-label={`Sales receipt details: ${receipt.number}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <ReceiptText className="size-5" />
          </DetailCardIcon>
        }
        title={receipt.number}
        meta={
          <Badge variant={documentStatusVariant(receipt.status)}>
            {receipt.status.toLowerCase()}
          </Badge>
        }
        subtitle={customer}
        actions={
          canRefund ? (
            <Link
              href={`/sales-receipts/${receipt.id}/refund`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Refund
            </Link>
          ) : undefined
        }
        closeHref="/sales-receipts"
        closeLabel="Close sales receipt details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(receipt.totalAmount, receipt.currency)}
          caption="Sales receipt total"
        />
        <DetailCardSection title="Sales receipt">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={customer} />
            <DetailCardFact
              label="Receipt date"
              value={formatDate(receipt.receiptAt)}
            />
            <DetailCardFact label="Currency" value={receipt.currency} mono />
            <DetailCardFact
              label="Credited"
              value={formatMoney(receipt.creditedAmount, receipt.currency)}
            />
            <DetailCardFact
              label="Cash refunded"
              value={formatMoney(receipt.refundedAmount, receipt.currency)}
            />
            <DetailCardFact
              label="Refund state"
              value={receipt.refundStatus.toLowerCase().replaceAll('_', ' ')}
            />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{receipt.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
