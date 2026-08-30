import { z } from 'zod'

const idSchema = z.string().trim().min(1)
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const requestEventStatusSchema = z.enum([
  'CONFIRMED',
  'TENTATIVE',
  'CANCELLED',
])
export type RequestEventStatus = z.infer<typeof requestEventStatusSchema>

export const requestEventBusyStatusSchema = z.enum(['BUSY', 'FREE'])
export type RequestEventBusyStatus = z.infer<typeof requestEventBusyStatusSchema>

export const requestEventParticipantKindSchema = z.enum(['USER', 'EMAIL'])
export const requestEventParticipantRoleSchema = z.enum([
  'CHAIR',
  'REQUIRED',
  'OPTIONAL',
])
export const requestEventParticipantStatusSchema = z.enum([
  'NEEDS_ACTION',
  'ACCEPTED',
  'DECLINED',
  'TENTATIVE',
  'DELEGATED',
])

export const requestEventParticipantSchema = z.object({
  object: z.literal('request_event_participant'),
  id: z.string(),
  eventId: z.string(),
  kind: requestEventParticipantKindSchema,
  participantId: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: requestEventParticipantRoleSchema,
  status: requestEventParticipantStatusSchema,
  delegatedTo: z.string().nullable(),
  delegatedFrom: z.string().nullable(),
  respondedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type RequestEventParticipant = z.infer<
  typeof requestEventParticipantSchema
>

export const requestEventSchema = z.object({
  object: z.literal('request_event'),
  id: z.string(),
  uid: z.string(),
  tenantId: z.string(),
  requestId: z.string(),
  calendarId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  status: requestEventStatusSchema,
  busyStatus: requestEventBusyStatusSchema,
  allDay: z.boolean(),
  startAt: z.number().int().nullable(),
  endAt: z.number().int().nullable(),
  timeZone: z.string().nullable(),
  startDate: dateOnlySchema.nullable(),
  endDate: dateOnlySchema.nullable(),
  recurrenceRuleId: z.string().nullable(),
  recurrenceId: z.string().nullable(),
  participants: z.array(requestEventParticipantSchema),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type RequestEvent = z.infer<typeof requestEventSchema>

export const requestEventListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestEventSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type RequestEventList = z.infer<typeof requestEventListSchema>

export const requestEventParticipantListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestEventParticipantSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

interface CreateRequestEventBaseInput {
  calendarId?: string
  title: string
  description?: string | null
  location?: string | null
  status?: RequestEventStatus
  busyStatus?: RequestEventBusyStatus
  recurrenceRuleId?: string | null
  recurrenceId?: string | null
  createdBy: string
}

export type CreateRequestEventInput = CreateRequestEventBaseInput &
  (
    | {
        allDay: false
        startAt: number
        endAt: number
        timeZone: string
      }
    | {
        allDay: true
        startDate: string
        endDate: string
        calendarTimeZone?: string
      }
  )

export interface UpdateRequestEventInput {
  calendarId?: string
  title?: string
  description?: string | null
  location?: string | null
  status?: RequestEventStatus
  busyStatus?: RequestEventBusyStatus
  allDay?: boolean
  startAt?: number | null
  endAt?: number | null
  timeZone?: string | null
  startDate?: string | null
  endDate?: string | null
  recurrenceRuleId?: string | null
  recurrenceId?: string | null
}

export interface CreateRequestEventParticipantInput {
  kind: 'USER' | 'EMAIL'
  participantId?: string | null
  email?: string | null
  name?: string | null
  role?: 'CHAIR' | 'REQUIRED' | 'OPTIONAL'
  status?: 'NEEDS_ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED'
  delegatedTo?: string | null
  delegatedFrom?: string | null
}

export interface UpdateRequestEventParticipantInput {
  name?: string | null
  role?: 'CHAIR' | 'REQUIRED' | 'OPTIONAL'
  status?: 'NEEDS_ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED'
  delegatedTo?: string | null
  delegatedFrom?: string | null
}

export const createRequestEventParticipantInputSchema = z
  .strictObject({
    kind: requestEventParticipantKindSchema,
    participantId: idSchema.optional().nullable(),
    email: z.email().optional().nullable(),
    name: z.string().trim().max(240).optional().nullable(),
    role: requestEventParticipantRoleSchema.optional(),
    status: requestEventParticipantStatusSchema.optional(),
    delegatedTo: idSchema.optional().nullable(),
    delegatedFrom: idSchema.optional().nullable(),
  })
  .superRefine((value, context) => {
    const user = value.kind === 'USER' && Boolean(value.participantId) && !value.email
    const email = value.kind === 'EMAIL' && !value.participantId && Boolean(value.email)
    if (!user && !email)
      context.addIssue({
        code: 'custom',
        message: 'USER participants require participantId; EMAIL participants require email.',
      })
  })
