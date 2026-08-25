export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high'

export type CrmCustomerProfile = {
  id: string
  organizationId: string
  customerId: string
  ownerId: string | null
  status: 'active' | 'inactive'
  createdAt: number
  updatedAt: number
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
