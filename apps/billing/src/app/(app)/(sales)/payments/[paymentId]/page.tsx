import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PaymentDetailCard } from '@876/billing-ui/payment-detail-card'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { getFeatures } from '@/lib/features'
import { formatDate, formatMoney } from '@/lib/format'
import { service, type LegacyBillingRecord } from '@/lib/service'
import { RelatedRequestsClient } from '../../../_components/related-requests-client'

type Props = { params: Promise<{ paymentId: string }> }

export const metadata: Metadata = {
  title: 'Payment',
}

export default async function PaymentPage({ params }: Props) {
  const context = await requirePagePermission('payments:read')
  const { paymentId } = await params
  const [payment, features]: [LegacyBillingRecord, Awaited<ReturnType<typeof getFeatures>>] =
    await Promise.all([
      service.payments.retrieve(context.tenant.id, paymentId),
      getFeatures({ userId: context.userId, organizationId: context.orgId }),
    ])
  if (!payment) notFound()

  const allocated = payment.invoiceAllocations.reduce(
    (total: bigint, allocation: LegacyBillingRecord) =>
      total + allocation.amount,
    0n
  )
  const canWrite = context.permissions.includes('payments:write')
  const canRefund =
    canWrite &&
    (payment.status === 'SUCCEEDED' ||
      payment.status === 'PARTIALLY_REFUNDED') &&
    payment.unappliedAmount > 0n

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
        allocations: payment.invoiceAllocations.map(
          (allocation: LegacyBillingRecord) => ({
            id: allocation.id,
            invoiceId: allocation.invoice.id,
            invoiceNumber: allocation.invoice.number,
            invoiceStatus: allocation.invoice.status,
            amount: formatMoney(allocation.amount, payment.currency),
            href: `/invoices/${allocation.invoice.id}`,
          })
        ),
        refunds: (payment.refunds ?? []).map((refund: LegacyBillingRecord) => ({
          id: refund.id,
          number: refund.number,
          amount: formatMoney(refund.amount, refund.currency),
          date: formatDate(refund.refundedAt ?? refund.createdAt),
          reason: refund.reason ?? null,
        })),
      }}
      closeHref="/payments"
      editHref={
        canWrite && payment.status === 'SUCCEEDED'
          ? `/payments/${payment.id}/edit`
          : undefined
      }
      refundHref={canRefund ? `/payments/${payment.id}/refund` : undefined}
    >
      {features.productFeatures.requests ? (
        <RelatedRequestsClient
          customerId={payment.customer.id}
          resourceType="payment"
          resourceId={payment.id}
          snapshot={{
            number: payment.number,
            amount: String(payment.amount),
            currency: payment.currency,
            status: payment.status,
          }}
        />
      ) : null}
    </PaymentDetailCard>
  )
}
