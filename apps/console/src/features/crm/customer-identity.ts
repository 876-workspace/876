export type CustomerIdentity = {
  name: string
  legalName: string | null
  isBusiness: boolean
  email: string | null
  phone: string | null
  contact: CustomerContact | null
  typeLabel: string
}

export type CustomerContact = {
  name: string
  email: string | null
  phone: string | null
  userId: string | null
  avatar: string | null
}

type CustomerLike = {
  name?: string | null
  companyName?: string | null
  customerKind?: string | null
  customerType?: string | null
  email?: string | null
  phone?: string | null
  workPhone?: string | null
  primaryContact?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    mobilePhone?: string | null
    workPhone?: string | null
    userId?: string | null
    avatar?: string | null
  } | null
}

function joinName(
  first: string | null | undefined,
  last: string | null | undefined
): string | null {
  const value = [first, last]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return value.length > 0 ? value : null
}

export function formatCustomerType(type?: string | null): string {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}

export function resolveCustomerIdentity(
  customer: CustomerLike | null | undefined,
  fallbackName: string
): CustomerIdentity {
  const isBusiness =
    customer?.customerKind === 'BUSINESS' ||
    (Boolean(customer?.companyName) &&
      customer?.companyName?.trim() !== customer?.name?.trim())
  const name =
    customer?.name?.trim() || customer?.companyName?.trim() || fallbackName

  const contactSource = isBusiness ? (customer?.primaryContact ?? null) : null
  const contact: CustomerContact | null = contactSource
    ? {
        name:
          joinName(contactSource.firstName, contactSource.lastName) ??
          contactSource.email ??
          'Unnamed contact',
        email: contactSource.email ?? null,
        phone: contactSource.mobilePhone ?? contactSource.workPhone ?? null,
        userId: contactSource.userId ?? null,
        avatar: contactSource.avatar ?? null,
      }
    : null

  const legalName = customer?.companyName?.trim() || null

  return {
    name,
    legalName: legalName && legalName !== name ? legalName : null,
    isBusiness,
    email: customer?.email ?? null,
    phone: customer?.phone ?? customer?.workPhone ?? null,
    contact,
    typeLabel: formatCustomerType(customer?.customerType),
  }
}
