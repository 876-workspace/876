import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DetailCard, DetailCardHeader } from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'
import { PaymentDetailCard } from '@876/billing-ui/payment-detail-card'

import { formatDate, formatMoney } from '@/lib/finance/format'

import { resolvePayment } from '../_lib/payment-data'

type Props = {
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params
  const payment = await resolvePayment(orgSlug, id)
  if (!payment) return { title: 'Payment not found' }

  return { title: `${payment.number} - Payments` }
}

/**
 * The payment record card in the detail column. Awaits `params` and nothing
 * else: the canonical Billing payment card streams behind its own boundary,
 * where `notFound()` is decided. The page below renders nothing — the card
 * owns both the header and the body.
 */
export default async function PaymentDetailLayout({ params }: Props) {
  const { orgSlug, id } = await params

  return (
    <Suspense key={id} fallback={<PaymentCardFallback orgSlug={orgSlug} />}>
      <PaymentDetailData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

async function PaymentDetailData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const payment = await resolvePayment(orgSlug, id)
  if (!payment) notFound()

  const allocated = payment.invoiceAllocations.reduce(
    (total, allocation) => total + BigInt(allocation.amount),
    BigInt(0)
  )

  return (
    <PaymentDetailCard
      payment={{
        id: payment.id,
        number: payment.number,
        status: payment.status,
        customerName: payment.customer.name,
        paymentDate: formatDate(payment.paymentDate),
        received: formatMoney(payment.amount, payment.currency),
        allocated: formatMoney(allocated, payment.currency),
        unapplied: formatMoney(payment.unappliedAmount, payment.currency),
        refunded: formatMoney(payment.amountRefunded, payment.currency),
        bankCharges: formatMoney(payment.bankCharges, payment.currency),
        paymentMode: payment.paymentMode.name,
        depositAccount: payment.depositAccount.name,
        reference: payment.referenceNumber ?? '—',
        notes: payment.notes,
        allocations: payment.invoiceAllocations.map((allocation) => ({
          id: allocation.id,
          invoiceId: allocation.invoice.id,
          invoiceNumber: allocation.invoice.number,
          invoiceStatus: allocation.invoice.status,
          amount: formatMoney(allocation.amount, payment.currency),
          href: `/${orgSlug}/invoices/${allocation.invoice.id}`,
        })),
        refunds: (payment.refunds ?? []).map((refund) => ({
          id: refund.id,
          number: refund.number,
          amount: formatMoney(refund.amount, refund.currency),
          date: formatDate(refund.refundedAt),
          reason: refund.reason,
        })),
      }}
      closeHref={`/${orgSlug}/payments`}
    />
  )
}

function PaymentCardFallback({ orgSlug }: { orgSlug: string }) {
  return (
    <DetailCard aria-label="Payment">
      <DetailCardHeader
        title={<Skeleton className="h-6 w-44" />}
        subtitle={<Skeleton className="h-3.5 w-72" />}
        closeHref={`/${orgSlug}/payments`}
        closeLabel="Close payment details"
      />
    </DetailCard>
  )
}
