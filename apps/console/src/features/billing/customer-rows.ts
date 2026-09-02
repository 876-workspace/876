import type { CustomerRow } from '@876/billing-ui/customers-table'
import type { BillingCustomer } from '@876/billing/service'

/**
 * Projects serialized finance customers onto the shared table's row shape.
 *
 * The party and its contact stay two labelled things: `companyName` is the
 * organization's own legal name and `contactName` the person on file, never a
 * fallback for each other (`.claude/rules/customer-architecture.md`).
 */
export function toCustomerRows(
  customers: readonly BillingCustomer[]
): CustomerRow[] {
  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    contactName: contactName(customer),
    phone: customer.phone ?? customer.workPhone,
    receivables: customer.outstandingReceivable,
    currency: customer.defaultCurrency ?? 'JMD',
    status: customer.status,
  }))
}

function contactName(customer: BillingCustomer): string | null {
  const contact = customer.primaryContact
  if (!contact) return null

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  return name.length > 0 ? name : null
}
