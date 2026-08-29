import { z } from 'zod'

import type { RequestPriority } from './priority.js'

export type RequestStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

/** How a request entered CRM. Placement describes where a form renders; channel describes the actual intake path. */
export const requestChannelSchema = z.enum([
  'FORM',
  'WIDGET',
  'CHAT',
  'EMAIL',
  'API',
  'AGENT',
])
export type RequestChannel = z.infer<typeof requestChannelSchema>

export type RequestNoteKind = 'DESCRIPTION' | 'NOTE' | 'EMAIL'
export type RequestNoteVisibility = 'PUBLIC' | 'INTERNAL' | 'PRIVATE'

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
  priorityId: string
  priority: RequestPriority
  channel: RequestChannel
  teamId: string | null
  assigneeId: string | null
  ownerId: string | null
  requesterUserId: string | null
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
  priorityId?: string
  requesterUserId?: string | null
}

export interface CreateRequestInput {
  customerId: string
  subject: string
  description?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  priorityId?: string
  /** Defaults to AGENT for direct CRM/Console creation. Intake forms set their own channel. */
  channel?: RequestChannel
  teamId?: string | null
  assigneeId?: string | null
  ownerId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export interface RequestIntakeContext {
  formId: string
  formVersion: number
  definitionSnapshot: unknown
  answers: Record<string, unknown>
  customerOrganizationId?: string | null
  customerUserId?: string | null
}

export interface UpdateRequestInput {
  subject?: string
  categoryId?: string | null
  subcategoryId?: string | null
  status?: RequestStatus
  priorityId?: string
  channel?: RequestChannel
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
  visibility: RequestNoteVisibility
  kind: RequestNoteKind
  editedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateRequestNoteInput {
  body: string
  authorId: string
  visibility?: RequestNoteVisibility
  /** @deprecated Use `visibility`. */
  internal?: boolean
}

export interface ListRequestNotesInput {
  viewerId?: string
  includePrivate?: boolean
}

export interface UpdateRequestNoteInput {
  body: string
  editedBy: string
  includePrivate?: boolean
}

export interface DeleteRequestNoteInput {
  deletedBy: string
  includePrivate?: boolean
}
