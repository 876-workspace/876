import type {
  CreateWorkEventParticipantInput,
  UpdateWorkEventParticipantInput,
  WorkEventBusyStatus,
  WorkEventParticipant,
  WorkEventStatus,
} from '@876/work'

export interface RequestEventParticipant {
  object: 'request_event_participant'
  id: string
  eventId: string
  kind: WorkEventParticipant['kind']
  participantId: string | null
  email: string | null
  name: string | null
  role: WorkEventParticipant['role']
  status: WorkEventParticipant['status']
  delegatedTo: string | null
  delegatedFrom: string | null
  respondedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface RequestEvent {
  object: 'request_event'
  id: string
  uid: string
  tenantId: string
  requestId: string
  calendarId: string
  title: string
  description: string | null
  location: string | null
  status: WorkEventStatus
  busyStatus: WorkEventBusyStatus
  allDay: boolean
  startAt: number | null
  endAt: number | null
  timeZone: string | null
  startDate: string | null
  endDate: string | null
  recurrenceRuleId: string | null
  recurrenceId: string | null
  participants: RequestEventParticipant[]
  createdBy: string
  createdAt: number
  updatedAt: number
}

type CreateEventBase = {
  calendarId?: string
  title: string
  description?: string | null
  location?: string | null
  status?: WorkEventStatus
  busyStatus?: WorkEventBusyStatus
  recurrenceRuleId?: string | null
  recurrenceId?: string | null
  createdBy: string
}

export type CreateEventInput = CreateEventBase &
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
        /** Used only when Work must create the user's primary calendar. */
        calendarTimeZone?: string
      }
  )

export interface UpdateEventInput {
  calendarId?: string
  title?: string
  description?: string | null
  location?: string | null
  status?: WorkEventStatus
  busyStatus?: WorkEventBusyStatus
  allDay?: boolean
  startAt?: number | null
  endAt?: number | null
  timeZone?: string | null
  startDate?: string | null
  endDate?: string | null
  recurrenceRuleId?: string | null
  recurrenceId?: string | null
}

export type CreateEventParticipantInput = CreateWorkEventParticipantInput
export type UpdateEventParticipantInput = UpdateWorkEventParticipantInput
