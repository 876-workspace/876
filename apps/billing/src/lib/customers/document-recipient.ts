import type { DocumentCustomerOption } from '@/types/customer'

interface DocumentRecipient {
  id: string
  name: string
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  companyName: string | null
  salutation: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  workPhone: string | null
  priceListId: string | null
  primaryContact?: {
    salutation?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    workPhone?: string | null
    mobilePhone?: string | null
  } | null
  contacts?: Array<{
    salutation: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    workPhone: string | null
    mobilePhone: string | null
  }>
  addresses?: DocumentCustomerOption['address'][]
}

export function toDocumentCustomerOption(
  customer: DocumentRecipient
): DocumentCustomerOption {
  const contact = customer.primaryContact ?? customer.contacts?.[0]
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
    address: customer.addresses?.[0] ?? null,
  }
}

function formatName(
  person:
    | {
        salutation?: string | null
        firstName?: string | null
        lastName?: string | null
      }
    | null
    | undefined
) {
  if (!person) return ''
  return [person.salutation, person.firstName, person.lastName]
    .filter(Boolean)
    .join(' ')
}
