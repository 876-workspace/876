import { notFound, redirect } from 'next/navigation'

import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { AppError } from '@876/ui/app-error'

import { InvoicePaymentReceivedForm } from '@/features/payments/components/payment-received-form'
import { getPaymentFormData } from '@/features/payments/payment-form-data'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Record Payment Received' }

type Props = { params: Promise<{ invoiceId: string }> }

export default async function NewInvoicePaymentPage({ params }: Props) {
  const { invoiceId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'payments.create'))
    redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const [invoiceResult, paymentFormData] = await Promise.all([
    billing.invoices.retrieve(invoiceId),
    getPaymentFormData(billing),
  ])
  if (invoiceResult.error?.code === 'invoice/not-found') notFound()
  if (invoiceResult.error || !invoiceResult.data || paymentFormData.error) {
    const failure = invoiceResult.error ?? paymentFormData.error
    return (
      <DetailCard aria-label="Payment entry unavailable">
        <DetailCardBody>
          <AppError
            error={{
              code: failure?.code ?? 'billing/payment-form-unavailable',
              message: 'Payment entry data is unavailable right now.',
            }}
          />
        </DetailCardBody>
      </DetailCard>
    )
  }

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
        <InvoicePaymentReceivedForm
          {...paymentFormData.data}
          prefill={{ customerId: invoice.customerId, invoiceId: invoice.id }}
          returnHref={returnHref}
        />
      </DetailCardBody>
    </DetailCard>
  )
}
