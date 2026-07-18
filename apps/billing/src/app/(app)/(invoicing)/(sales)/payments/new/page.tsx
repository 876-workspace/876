import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { PaymentForm } from '@/components/payment-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { getPaymentFormData } from '../form-data'

export const metadata = { title: 'New Payment' }

export default async function NewPaymentPage() {
  const context = await requirePagePermission('payments:write')
  const data = await getPaymentFormData(context.tenant.id)

  return (
    <Page>
      <PageBreadcrumb
        href="/payments"
        label="Payments Received"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>New payment</PageTitle>
        <PageDescription>
          Record money received, select its deposit account, and settle open
          invoices.
        </PageDescription>
      </PageHeader>
      <PaymentForm {...data} defaultCurrency={context.tenant.defaultCurrency} />
    </Page>
  )
}
