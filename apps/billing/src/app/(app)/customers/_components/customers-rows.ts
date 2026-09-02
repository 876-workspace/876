import type { service } from '@/lib/service'
import type { CustomerTableRow } from '@/types/customer'

type ListedCustomer = Awaited<ReturnType<typeof service.customers.list>>[number]

/** Projects the service's customer records onto the list's row contract. */
export function toCustomerTableRows(
  customers: ListedCustomer[],
  defaultCurrency: string
): CustomerTableRow[] {
  return customers.map((customer) => {
    const contact = customer.primaryContact ?? customer.contacts?.[0]
    const contactName =
      [contact?.firstName, contact?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null

    return {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      contactName,
      phone:
        customer.phone ??
        customer.workPhone ??
        contact?.mobilePhone ??
        contact?.workPhone ??
        null,
      receivables: Number(customer.outstandingReceivable ?? 0),
      currency: customer.defaultCurrency ?? defaultCurrency,
      status: customer.status,
    }
  })
}
