export type RequestStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type RequestCategory =
  | 'GENERAL'
  | 'SUPPORT'
  | 'BILLING'
  | 'SALES'
  | 'COMPLAINT'
  | 'FEEDBACK'
  | 'OTHER'

export type RequestSource =
  | 'CRM'
  | 'EMAIL'
  | 'PHONE'
  | 'CHAT'
  | 'WEB'
  | 'API'
  | 'OTHER'

export interface CrmRequest {
  object: 'request'
  id: string
  tenantId: string
  customerId: string
  number: number
  subject: string
  description: string | null
  category: RequestCategory
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  assigneeId: string | null
  createdBy: string
  resolvedAt: number | null
  closedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateRequestInput {
  customerId: string
  subject: string
  description?: string | null
  category?: RequestCategory
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
  createdBy: string
}

export interface UpdateRequestInput {
  subject?: string
  description?: string | null
  category?: RequestCategory
  status?: RequestStatus
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
}

export interface DeleteRequestInput {
  deletedBy: string
  reason?: string | null
}
