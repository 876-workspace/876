import type { PaymentRow } from '@876/billing-ui/payments-table'
import type { BillingPayment } from '@876/billing/service'

/**
 * Projects serialized payments onto the shared table's row shape.
 *
 * A payment already carries its customer, mode and deposit account inline, so
 * no row needs a second request to render.
 */
export function toPaymentRows(
  payments: readonly BillingPayment[]
): PaymentRow[] {
  return payments.map((payment) => ({
    id: payment.id,
    number: payment.number,
    customerName: payment.customer.name,
    amount: payment.amount,
    currency: payment.currency,
    paymentDate: payment.paymentDate,
    status: payment.status,
    depositAccountName: payment.depositAccount.name,
  }))
}
