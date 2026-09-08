import { notFound, redirect } from 'next/navigation'

import { PaymentDetailCard } from '@876/billing-ui/payment-detail-card'
import { DetailCard, DetailCardBody } from '@876/ui/detail-card'

import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
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
  const [result, access] = await Promise.all([
    billing.payments.retrieve(paymentId),
    resolveAccessContext(context.userId, context.orgId),
  ])
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
  const canEdit = access.status === 'ok' && canAccess(access.context, 'payments.edit')
  const canRefund =
    canEdit &&
    (payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED') &&
    BigInt(payment.unappliedAmount) > 0n

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
          href: `/invoices/${allocation.invoice.id}`,
        })),
        refunds: (payment.refunds ?? []).map((refund) => ({
          id: refund.id,
          number: refund.number,
          amount: formatMoney(refund.amount, refund.currency),
          date: formatDate(refund.refundedAt),
          reason: refund.reason,
        })),
      }}
      closeHref="/payments"
      editHref={
        canEdit && payment.status === 'SUCCEEDED'
          ? `/payments/${payment.id}/edit`
          : undefined
      }
      refundHref={canRefund ? `/payments/${payment.id}/refund` : undefined}
    />
  )
}
