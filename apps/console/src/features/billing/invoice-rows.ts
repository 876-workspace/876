import type { InvoiceRow } from '@876/billing-ui/invoices-table'
import type { BillingCustomer, BillingInvoice } from '@876/billing/service'

/**
 * Projects serialized invoices onto the shared table's row shape.
 *
 * Invoices carry a `customerId` rather than a name, so names are resolved from
 * one already-loaded customer page instead of a retrieve per row.
 */
export function toInvoiceRows(
  invoices: readonly BillingInvoice[],
  customers: readonly BillingCustomer[]
): InvoiceRow[] {
  const nameById = new Map(
    customers.map((customer) => [customer.id, customer.name])
  )

  return invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    totalAmount: invoice.totalAmount,
    amountDue: invoice.amountDue,
    currency: invoice.currency,
    status: invoice.status,
    customer: nameById.get(invoice.customerId) ?? null,
  }))
}
