import { notFound } from 'next/navigation'

import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { PaymentForm } from '@/features/payments/components/payment-form'
import { getPaymentFormData } from '@/features/payments/payment-form-data'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Record Payment Received' }

type Props = { params: Promise<{ invoiceId: string }> }

export default async function NewInvoicePaymentPage({ params }: Props) {
  const { invoiceId } = await params
  const context = await requirePagePermission('payments:write')
  const billing = await getBilling()
  const [invoiceResult, paymentFormData] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    getPaymentFormData(context.tenant.id),
  ])
  if (invoiceResult.error?.code === 'invoice/not-found') notFound()
  if (invoiceResult.error || !invoiceResult.data) notFound()

  const invoice = invoiceResult.data
  const returnHref = `/invoices/${encodeURIComponent(invoice.id)}`

  return (
    <DetailCard aria-label={`Payment for ${invoice.number}`}>
      <DetailCardHeader
        title={`Payment for ${invoice.number}`}
        closeHref={returnHref}
        closeLabel="Return to invoice"
      />
      <DetailCardBody>
        <PaymentForm
          {...paymentFormData}
          defaultCurrency={context.tenant.defaultCurrency}
          prefill={{ customerId: invoice.customerId, invoiceId: invoice.id }}
          returnHref={returnHref}
        />
      </DetailCardBody>
    </DetailCard>
  )
}
