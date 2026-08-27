import type { RegistryCustomer } from '@876/crm'

/**
 * The two parties a CRM row is actually about.
 *
 * 876 has organizations *and* customers, and for a business customer they are
 * not the same thing: the customer is the company, and the person you email is
 * its primary contact. Rendering one `customer.email` field collapsed the two,
 * so a business customer showed its owner's personal address as if it were the
 * company's. Everything that displays a customer resolves through here so the
 * two stay separate in one place rather than in each component.
 */
export type CustomerIdentity = {
  /** The party's display name — the trading name for a business. */
  name: string
  /** The registered legal name, only when it differs from `name`. */
  legalName: string | null
  /** True when the party is a company rather than a person. */
  isBusiness: boolean
  /** The company's own email/phone. Never the contact's. */
  email: string | null
  phone: string | null
  /** The person attached to the party, or null when there is none. */
  contact: CustomerContact | null
  /** How the party links to 876 identity, in words. */
  typeLabel: string
}

export type CustomerContact = {
  name: string
  email: string | null
  phone: string | null
  /** The 876 account behind the contact, when they have one. */
  userId: string | null
  /**
   * The contact's picture, snapshotted from their 876 account by the Core
   * sync. Null for a hand-entered contact — the avatar falls back to a
   * monogram, which is why nothing downstream has to branch on it.
   */
  avatar: string | null
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

/**
 * Resolves a registry customer into its party and its contact.
 *
 * `fallbackName` is what to show when the registry read failed or the row has
 * no name — normally the id, so the record is still reachable rather than
 * rendering blank.
 */
export function resolveCustomerIdentity(
  customer: RegistryCustomer | null | undefined,
  fallbackName: string
): CustomerIdentity {
  const isBusiness = customer?.customerKind === 'BUSINESS'
  const name = customer?.name?.trim() || fallbackName

  // An individual is their own contact — the party record already carries the
  // person, so synthesizing a second "contact" for them would render the same
  // human twice. Only a business has a contact distinct from the party.
  const contactSource = isBusiness ? (customer?.primaryContact ?? null) : null
  const contact: CustomerContact | null = contactSource
    ? {
        name:
          joinName(contactSource.firstName, contactSource.lastName) ??
          contactSource.email ??
          'Unnamed contact',
        email: contactSource.email,
        phone: contactSource.mobilePhone ?? contactSource.workPhone,
        userId: contactSource.userId,
        avatar: contactSource.avatar ?? null,
      }
    : null

  const legalName = customer?.companyName?.trim() || null

  return {
    name,
    legalName: legalName && legalName !== name ? legalName : null,
    isBusiness,
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    contact,
    typeLabel: formatCustomerType(customer?.customerType),
  }
}
