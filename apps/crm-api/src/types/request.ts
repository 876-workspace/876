export type RequestStatus =
  'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type RequestSource =
  'CRM' | 'EMAIL' | 'PHONE' | 'CHAT' | 'WEB' | 'API' | 'OTHER'

export type RequestNoteKind = 'DESCRIPTION' | 'NOTE' | 'EMAIL'

export interface CrmRequest {
  object: 'request'
  id: string
  tenantId: string
  customerId: string
  number: number
  subject: string
  categoryId: string | null
  subcategoryId: string | null
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  teamId: string | null
  assigneeId: string | null
  ownerId: string | null
  /**
   * The 876 account that raised this request, when a named person did. Null on
   * a request standing for the customer organization as a whole.
   */
  requesterUserId: string | null
  /** The registry contact that raised this request, when one is known. */
  requesterContactId: string | null
  createdBy: string
  resolvedAt: number | null
  closedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface ListRequestsFilter {
  status?: RequestStatus
  teamId?: string | null
  assigneeId?: string | null
  customerId?: string
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  priority?: RequestPriority
  requesterUserId?: string | null
}

export interface CreateRequestInput {
  customerId: string
  subject: string
  /** The opening message. The service stores it as the request's DESCRIPTION note. */
  description?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  priority?: RequestPriority
  source?: RequestSource
  teamId?: string | null
  assigneeId?: string | null
  ownerId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export interface UpdateRequestInput {
  subject?: string
  categoryId?: string | null
  subcategoryId?: string | null
  status?: RequestStatus
  priority?: RequestPriority
  source?: RequestSource
  teamId?: string | null
  assigneeId?: string | null
  ownerId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
}

export interface DeleteRequestInput {
  deletedBy: string
  reason?: string | null
}

export interface CrmRequestNote {
  object: 'request_note'
  id: string
  tenantId: string
  requestId: string
  body: string
  authorId: string
  internal: boolean
  kind: RequestNoteKind
  editedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateRequestNoteInput {
  body: string
  authorId: string
  internal?: boolean
}

export interface UpdateRequestNoteInput {
  body: string
  editedBy: string
}

export interface DeleteRequestNoteInput {
  deletedBy: string
}
