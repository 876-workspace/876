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
import { CreditCardIcon } from '@876/ui/icons'

import { getInvoiceContext } from '@/lib/auth/context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'

type Props = { params: Promise<{ paymentId: string }> }

export const metadata = {
  title: 'Payment',
  description: 'Payment details.',
}

export default async function PaymentDetailPage({ params }: Props) {
  const { paymentId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.payments.retrieve(paymentId)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return (
      <DetailCard aria-label="Payment unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Payment details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const payment = result.data
  const allocated = payment.invoiceAllocations.reduce(
    (total, allocation) => total + BigInt(allocation.amount),
    0n
  )

  return (
    <DetailCard aria-label={`Payment details: ${payment.number}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <CreditCardIcon className="size-5" />
          </DetailCardIcon>
        }
        title={payment.number}
        meta={<Badge variant="secondary">{payment.status}</Badge>}
        subtitle={`${payment.customer.name} · ${formatDate(payment.paymentDate)}`}
        closeHref="/payments"
        closeLabel="Close payment details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(payment.amount, payment.currency)}
          caption="Payment received"
        />
        <DetailCardSection title="Payment">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={payment.customer.name} />
            <DetailCardFact
              label="Received"
              value={formatDate(payment.paymentDate)}
            />
            <DetailCardFact
              label="Deposit account"
              value={payment.depositAccount.name}
            />
            <DetailCardFact
              label="Payment mode"
              value={payment.paymentMode.name}
            />
            <DetailCardFact
              label="Allocated"
              value={formatMoney(allocated, payment.currency)}
              mono
            />
            <DetailCardFact
              label="Unapplied"
              value={formatMoney(payment.unappliedAmount, payment.currency)}
              mono
            />
            <DetailCardFact
              label="Reference"
              value={payment.referenceNumber ?? '—'}
              mono
            />
          </DetailCardFacts>
        </DetailCardSection>
        {payment.notes ? (
          <DetailCardSection title="Notes">
            <p className="text-foreground text-sm leading-6">{payment.notes}</p>
          </DetailCardSection>
        ) : null}
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{payment.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
