import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { PaymentModeForm } from '@/components/payment-mode-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'New Payment Mode - Settings' }

export default async function NewPaymentModePage() {
  await requirePagePermission('payments:write')

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/payment-modes"
        label="Payment modes"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>New payment mode</PageTitle>
        <PageDescription>
          Add a tenant-specific method such as Check or Bank Remittance.
        </PageDescription>
      </PageHeader>
      <PaymentModeForm />
    </Page>
  )
}
