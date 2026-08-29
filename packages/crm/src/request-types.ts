import { z } from 'zod'

import { requestPrioritySchema } from './types'

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])

/** How a request entered CRM. This replaces the former overlapping RequestSource axis. */
export const requestChannelSchema = z.enum([
  'FORM',
  'WIDGET',
  'CHAT',
  'EMAIL',
  'API',
  'AGENT',
])

export const crmRequestSchema = z.object({
  object: z.literal('request'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  number: z.number().int().positive(),
  subject: z.string(),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  status: requestStatusSchema,
  priorityId: z.string(),
  priority: requestPrioritySchema,
  channel: requestChannelSchema,
  teamId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  ownerId: z.string().nullable(),
  requesterUserId: z.string().nullable(),
  requesterContactId: z.string().nullable(),
  createdBy: z.string(),
  resolvedAt: z.number().int().nullable(),
  closedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const requestListSchema = z.object({
  object: z.literal('list'),
  data: z.array(crmRequestSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type RequestStatus = z.infer<typeof requestStatusSchema>
export type RequestChannel = z.infer<typeof requestChannelSchema>
export type CrmRequest = z.infer<typeof crmRequestSchema>
export type RequestList = z.infer<typeof requestListSchema>

export interface ListRequestsQuery {
  status?: RequestStatus
  teamId?: string
  assigneeId?: string
  customerId?: string
  categoryId?: string
  subcategoryId?: string
  ownerId?: string
  /** `'unassigned'` selects requests raised for the organization as a whole. */
  requesterUserId?: string
  priorityId?: string
}

export interface CreateRequestInput {
  customerId: string
  subject: string
  /** The opening message. The service stores it as the request's DESCRIPTION note. */
  description?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  priorityId?: string
  /** Defaults to AGENT for direct CRM/Console creation. */
  channel?: RequestChannel
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export interface UpdateRequestInput {
  subject?: string
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  status?: RequestStatus
  priorityId?: string
  channel?: RequestChannel
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
}
