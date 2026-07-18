import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { PaymentForm } from '@/components/payment-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { getPaymentFormData } from '../../form-data'

type Props = { params: Promise<{ paymentId: string }> }

export default async function EditPaymentPage({ params }: Props) {
  const context = await requirePagePermission('payments:write')
  const { paymentId } = await params
  const payment = await service.payments.retrieve(context.tenant.id, paymentId)
  if (!payment) notFound()

  const data = await getPaymentFormData(context.tenant.id, payment)

  return (
    <Page>
      <PageBreadcrumb
        href={`/payments/${payment.id}`}
        label={payment.number}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit payment</PageTitle>
        <PageDescription>
          Saving replaces the allocation set and recalculates invoice balances.
        </PageDescription>
      </PageHeader>
      <PaymentForm
        {...data}
        defaultCurrency={context.tenant.defaultCurrency}
        initial={{
          id: payment.id,
          number: payment.number,
          customerId: payment.customerId,
          paymentModeId: payment.paymentModeId,
          depositAccountId: payment.depositAccountId,
          amount: payment.amount.toString(),
          bankCharges: payment.bankCharges.toString(),
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          allocations: payment.invoiceAllocations.map((allocation) => ({
            invoiceId: allocation.invoiceId,
            amount: allocation.amount.toString(),
          })),
        }}
      />
    </Page>
  )
}
