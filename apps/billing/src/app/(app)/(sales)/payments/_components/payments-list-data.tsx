import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service, type LegacyBillingRecord } from '@/lib/service'
import { PaymentsList } from './payments-list'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function PaymentsListData() {
  const context = await requirePagePermission('payments:read')
  const payments: LegacyBillingRecord[] = await service.payments.list(
    context.tenant.id
  )

  const rows = payments.map((payment) => {
    const allocated = payment.invoiceAllocations.reduce(
      (total, allocation) => total + allocation.amount,
      0n
    )

    return {
      id: payment.id,
      number: payment.number,
      customerName: payment.customer.name,
      paymentDate: formatDate(payment.paymentDate),
      paymentModeName: payment.paymentMode.name,
      depositAccountName: payment.depositAccount.name,
      amount: formatMoney(payment.amount, payment.currency),
      allocated: formatMoney(allocated, payment.currency),
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PaymentsList payments={rows} />
    </div>
  )
}
