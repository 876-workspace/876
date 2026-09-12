export type CustomerProfileStatus = 'ACTIVE' | 'INACTIVE'

export interface CustomerProfile {
  id: string
  tenantId: string
  billingCustomerId: string
  ownerId: string | null
  status: CustomerProfileStatus
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
}

export interface RegistryCustomer {
  id: string
  customerType: 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  name: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
}

export interface CrmCustomer {
  object: 'customer_profile'
  profile: CustomerProfile
  customer: RegistryCustomer | null
}

export interface CreateCustomerInput {
  idempotencyKey: string
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
  /**
   * Links this customer to an 876 account, making it a `CORE_USER` customer.
   * Only valid with `customerKind: 'INDIVIDUAL'` — a person is not a company.
   */
  userId?: string | null
  /**
   * Links this customer to an 876 organization, making it a
   * `CORE_ORGANIZATION` customer. Only valid with `customerKind: 'BUSINESS'`.
   */
  organizationId?: string | null
}

export interface UpdateCustomerInput {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
  status?: CustomerProfileStatus
}

export interface DeleteCustomerInput {
  deletedBy: string
  reason?: string | null
}

/**
 * Narrows a customer list to the one linked to a given 876 party.
 *
 * Named `customer*` because the route already carries an `organizationId` — the
 * tenant whose workspace is being read. These name the party a customer *is*,
 * which is a different organization entirely when Console asks "is org X a
 * customer in 876's own workspace?".
 */
export interface ListCustomersFilter {
  customerOrganizationId?: string
  customerUserId?: string
  billingCustomerId?: string
}
