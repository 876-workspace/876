import { CreditCardIcon } from '@876/ui/icons'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service, type LegacyBillingRecord } from '@/lib/service'

import { PaymentsList, type PaymentListRow } from './payments-list'

/** Data half of the persistent payments-received list column. */
export async function PaymentsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const payments: LegacyBillingRecord[] = await service.payments.list(
    context.tenant.id
  )

  if (payments.length === 0) {
    return (
      <div className="876-card px-6 py-14 text-center">
        <CreditCardIcon className="text-muted-foreground mx-auto size-7" />
        <p className="mt-3 font-medium">No payments received</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          Record a customer payment and distribute it across one or more open
          invoices.
        </p>
      </div>
    )
  }

  const rows: PaymentListRow[] = payments.map((payment) => ({
    id: payment.id,
    number: payment.number,
    customerName: payment.customer.name,
    paymentDate: payment.paymentDate,
    paymentModeName: payment.paymentMode.name,
    depositAccountName: payment.depositAccount.name,
    amount: payment.amount.toString(),
    allocated: payment.invoiceAllocations
      .reduce((total, allocation) => total + allocation.amount, 0n)
      .toString(),
    currency: payment.currency,
    status: payment.status,
  }))

  return <PaymentsList payments={rows} />
}
