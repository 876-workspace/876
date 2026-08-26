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
