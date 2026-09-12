import { redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'
import { AppError } from '@876/ui/app-error'

import { InvoicePaymentReceivedForm } from '@/features/payments/components/payment-received-form'
import { getPaymentFormData } from '@/features/payments/payment-form-data'
import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'Record Payment Received' }

type Props = {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>
}

export default async function NewPaymentPage({ searchParams }: Props) {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'payments.create'))
    redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const paymentFormData = await getPaymentFormData(billing)
  if (paymentFormData.error) {
    return (
      <Page>
        <AppError
          error={{
            code: paymentFormData.error.code,
            message: 'Payment entry data is unavailable right now.',
          }}
        />
      </Page>
    )
  }

  const { customerId, invoiceId } = await searchParams
  return (
    <Page>
      <PageBreadcrumb
        href="/payments"
        label="Payments Received"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Record payment received</PageTitle>
        <PageDescription>
          Record money from a customer, optionally apply it to outstanding
          invoices, and keep any unused amount as customer credit.
        </PageDescription>
      </PageHeader>
      <InvoicePaymentReceivedForm
        {...paymentFormData.data}
        prefill={{ customerId, invoiceId }}
      />
    </Page>
  )
}
