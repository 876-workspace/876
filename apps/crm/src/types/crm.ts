import type { BillingCustomer } from '@876/billing/integration'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high'
export type CrmCustomerProfileStatus = 'ACTIVE' | 'INACTIVE'

export type CrmCustomerProfile = {
  id: string
  organizationId: string
  billingCustomerId: string
  ownerId: string | null
  status: CrmCustomerProfileStatus
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  deletedBy: string | null
  deletionReason: string | null
}

export type CrmCustomer = {
  profile: CrmCustomerProfile
  customer: BillingCustomer | null
}

export type CrmCustomerCreateInput = {
  idempotencyKey: string
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
}

export type CrmCustomerUpdateInput = {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
  status?: CrmCustomerProfileStatus
}

export type CrmContact = {
  id: string
  organizationId: string
  customerId: string
  name: string
  email: string | null
  phone: string | null
  userId: string | null
  createdAt: number
  updatedAt: number
}

export type CrmTicket = {
  id: string
  organizationId: string
  customerId: string
  contactId: string | null
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  categoryId: string | null
  assigneeId: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
  closedAt: number | null
}

export type CrmTicketNote = {
  id: string
  organizationId: string
  ticketId: string
  authorId: string
  content: string
  createdAt: number
  updatedAt: number
}

export type CrmTicketCategory = {
  id: string
  organizationId: string
  name: string
  slug: string
  active: boolean
  createdAt: number
  updatedAt: number
}
