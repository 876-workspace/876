import Link from 'next/link'

import { CreditCardIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

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

      {payments.length === 0 ? (
        <div className="876-card px-6 py-14 text-center">
          <CreditCardIcon className="text-muted-foreground mx-auto size-7" />
          <p className="mt-3 font-medium">No payments received</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Record a customer payment and distribute it across one or more open
            invoices.
          </p>
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="divide-border divide-y">
            {payments.map((payment) => {
              const allocated = payment.invoiceAllocations.reduce(
                (total, allocation) => total + allocation.amount,
                0n
              )
              return (
                <Link
                  key={payment.id}
                  href={`/payments/${payment.id}`}
                  className="hover:bg-muted/30 grid gap-3 px-5 py-4 transition-colors sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{payment.number}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {payment.customer.name} ·{' '}
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p>{payment.paymentMode.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Deposited to {payment.depositAccount.name}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold tabular-nums">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatMoney(allocated, payment.currency)} allocated
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </Page>
  )
}
