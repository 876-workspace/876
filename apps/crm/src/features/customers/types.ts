/**
 * The row shape every customers surface renders — the list, the condensed
 * split list, and each tab of the customer card.
 *
 * It lives in `features/customers` rather than beside one component because
 * both the route's `_lib` loaders and its `_components` depend on it, and a
 * type owned by a leaf component cannot be imported by the loader that
 * produces it without inverting the dependency.
 */
export type CrmCustomerRow = {
  profileId: string
  billingCustomerId: string
  /** The party's name — the company for a business, the person otherwise. */
  name: string
  legalName?: string | null
  isBusiness: boolean
  typeLabel?: string
  /** The party's own email/phone. For a business, never the contact's. */
  email: string | null
  phone: string | null
  /** The person attached to a business customer. Null for an individual. */
  contactName: string | null
  contactEmail: string | null
  contactPhone?: string | null
  contactUserId?: string | null
  contactAvatar?: string | null
  ownerId?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt?: number
  updatedAt?: number
}
