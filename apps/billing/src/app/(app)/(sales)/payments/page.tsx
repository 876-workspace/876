import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { PaymentsList } from './_components/payments-list'

export const metadata = {
  title: 'Payments Received',
  description: 'Customer payments allocated to invoices.',
}

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
]

export default async function PaymentsPage() {
  const context = await requirePagePermission('payments:read')
  const payments = await service.payments.list(context.tenant.id)
  const canManage = context.permissions.includes('payments:write')

  return (
    <Page>
      <ResourceToolbar
        title="Payments Received"
        titleFilter={
          <StatusFilterHeading
            label="Payments Received"
            value="all"
            options={PAYMENT_STATUS_OPTIONS}
          />
        }
        primaryLabel={canManage ? 'Add' : undefined}
        primaryHref={canManage ? '/payments/new' : undefined}
        primaryVariant="info"
        refresh
      />

      <PaymentsList payments={payments} />
    </Page>
  )
}
