import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { PaymentForm } from '@/features/payments/components/payment-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { getPaymentFormData } from '../_lib/form-data'

export const metadata = { title: 'Record Payment Received' }

type Props = {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>
}

export default async function NewPaymentPage({ searchParams }: Props) {
  const context = await requirePagePermission('payments:write')
  const { customerId, invoiceId } = await searchParams
  const data = await getPaymentFormData(context.tenant.id)

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
      <PaymentForm
        {...data}
        defaultCurrency={context.tenant.defaultCurrency}
        prefill={{ customerId, invoiceId }}
      />
    </Page>
  )
}
