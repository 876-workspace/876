import type { listDocumentRecipients } from '@/lib/service/customers/list'
import type { DocumentCustomerOption } from '@/types/customer'

type DocumentRecipient = Awaited<
  ReturnType<typeof listDocumentRecipients>
>[number]

export function toDocumentCustomerOption(
  customer: DocumentRecipient
): DocumentCustomerOption {
  const contact = customer.contacts[0]
  const organizationName =
    customer.companyName ??
    (customer.customerKind === 'BUSINESS' ? customer.name : null)
  const contactName =
    formatName(contact) ||
    formatName(customer) ||
    (organizationName ? null : customer.name)

  return {
    value: customer.id,
    label: organizationName ?? contactName ?? customer.name,
    priceListId: customer.priceListId,
    organizationName,
    contactName,
    email: contact?.email ?? customer.email,
    phone:
      contact?.mobilePhone ??
      contact?.workPhone ??
      customer.phone ??
      customer.workPhone,
    address: customer.addresses[0] ?? null,
  }
}

function formatName(
  person:
    | {
        salutation: string | null
        firstName: string | null
        lastName: string | null
      }
    | null
    | undefined
) {
  if (!person) return ''
  return [person.salutation, person.firstName, person.lastName]
    .filter(Boolean)
    .join(' ')
}
