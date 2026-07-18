import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { PaymentModeForm } from '@/components/payment-mode-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

type Props = { params: Promise<{ modeId: string }> }

export default async function EditPaymentModePage({ params }: Props) {
  const context = await requirePagePermission('payments:write')
  const { modeId } = await params
  const mode = await service.paymentModes.retrieve(context.tenant.id, modeId)
  if (!mode) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/payment-modes"
        label="Payment modes"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit payment mode</PageTitle>
        <PageDescription>
          Built-in names are fixed; availability and the default can change.
        </PageDescription>
      </PageHeader>
      <PaymentModeForm initial={mode} />
    </Page>
  )
}
