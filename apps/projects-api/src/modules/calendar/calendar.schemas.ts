import { z } from 'zod'

export const EVENT_KINDS = ['event', 'meeting'] as const
export const ATTENDEE_RESPONSES = [
  'invited',
  'accepted',
  'declined',
  'tentative',
] as const
export const RECURRENCE_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const
export const CALENDAR_ENTRY_KINDS = [
  'project',
  'phase',
  'work-item',
  'event',
  'meeting',
] as const

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const eventParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
})

export const attendeeParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

export const reminderParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  reminderId: z.string().trim().min(1),
})

const recurrenceInputSchema = z.strictObject({
  freq: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number().int().min(1).max(1000).optional(),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.number().int().nonnegative().optional(),
  count: z.number().int().min(1).max(10000).optional(),
})

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>

const nullableRecurrenceInputSchema = z.strictObject({
  freq: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number().int().min(1).max(1000).nullable().optional(),
  byWeekday: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .nullable()
    .optional(),
  until: z.number().int().nonnegative().nullable().optional(),
  count: z.number().int().min(1).max(10000).nullable().optional(),
})

export const createEventBodySchema = z.strictObject({
  projectId: z.string().trim().min(1),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  issueId: z.string().trim().min(1).nullable().optional(),
  kind: z.enum(EVENT_KINDS).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative().nullable().optional(),
  allDay: z.boolean().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  meetingUrl: z.string().trim().max(2000).nullable().optional(),
  createdBy: z.string().trim().min(1).nullable().optional(),
  recurrence: recurrenceInputSchema.nullable().optional(),
})

export type CreateEventBody = z.infer<typeof createEventBodySchema>

export const updateEventBodySchema = z
  .strictObject({
    milestoneId: z.string().trim().min(1).nullable().optional(),
    issueId: z.string().trim().min(1).nullable().optional(),
    kind: z.enum(EVENT_KINDS).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    startsAt: z.number().int().nonnegative().optional(),
    endsAt: z.number().int().nonnegative().nullable().optional(),
    allDay: z.boolean().optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingUrl: z.string().trim().max(2000).nullable().optional(),
    recurrence: nullableRecurrenceInputSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type UpdateEventBody = z.infer<typeof updateEventBodySchema>

export const listEventsQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
})

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>

export const addAttendeeBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  response: z.enum(ATTENDEE_RESPONSES).optional(),
})

export type AddAttendeeBody = z.infer<typeof addAttendeeBodySchema>

export const respondAttendeeBodySchema = z.strictObject({
  response: z.enum(ATTENDEE_RESPONSES),
})

export type RespondAttendeeBody = z.infer<typeof respondAttendeeBodySchema>

function hasTarget(value: {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
}): boolean {
  return Boolean(value.issueId ?? value.milestoneId ?? value.eventId)
}

function hasTiming(value: {
  remindAt?: number | null
  offsetMinutesBeforeDue?: number | null
}): boolean {
  return (
    value.remindAt !== undefined &&
    value.remindAt !== null
  ) || (
    value.offsetMinutesBeforeDue !== undefined &&
    value.offsetMinutesBeforeDue !== null
  )
}

export const createReminderBodySchema = z
  .strictObject({
    issueId: z.string().trim().min(1).nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    eventId: z.string().trim().min(1).nullable().optional(),
    remindAt: z.number().int().nonnegative().nullable().optional(),
    offsetMinutesBeforeDue: z.number().int().min(0).max(525600).nullable().optional(),
    recurrence: recurrenceInputSchema.nullable().optional(),
    channel: z.literal('in-app').optional(),
    createdBy: z.string().trim().min(1),
    active: z.boolean().optional(),
  })
  .refine(hasTarget, {
    message: 'At least one reminder target must be provided',
  })
  .refine(hasTiming, {
    message: 'Either remindAt or offsetMinutesBeforeDue must be provided',
  })

export type CreateReminderBody = z.infer<typeof createReminderBodySchema>

export const updateReminderBodySchema = z
  .strictObject({
    issueId: z.string().trim().min(1).nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    eventId: z.string().trim().min(1).nullable().optional(),
    remindAt: z.number().int().nonnegative().nullable().optional(),
    offsetMinutesBeforeDue: z.number().int().min(0).max(525600).nullable().optional(),
    recurrence: nullableRecurrenceInputSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type UpdateReminderBody = z.infer<typeof updateReminderBodySchema>

export const listRemindersQuerySchema = z.strictObject({
  createdBy: z.string().trim().min(1),
})

export type ListRemindersQuery = z.infer<typeof listRemindersQuerySchema>

export const reminderMutationQuerySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type ReminderMutationQuery = z.infer<typeof reminderMutationQuerySchema>

export const dueRemindersQuerySchema = z.strictObject({
  at: z.coerce.number().int().nonnegative().optional(),
  createdBy: z.string().trim().min(1).optional(),
})

export type DueRemindersQuery = {
  at: number | null
  createdBy?: string
}

export function parseDueRemindersQuery(input: {
  at?: unknown
  createdBy?: unknown
}): DueRemindersQuery {
  const parsed = dueRemindersQuerySchema.parse(input)
  return { at: parsed.at ?? null, createdBy: parsed.createdBy }
}

const calendarKindListSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const kinds = value
      .split(',')
      .map((kind) => kind.trim())
      .filter((kind) => kind.length > 0)
    const allowed = new Set<string>(CALENDAR_ENTRY_KINDS)
    const invalid = kinds.filter((kind) => !allowed.has(kind))
    if (invalid.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Unknown calendar kind: ${invalid.join(', ')}`,
      })
      return z.NEVER
    }
    return kinds as Array<(typeof CALENDAR_ENTRY_KINDS)[number]>
  })

export type CalendarQuery = {
  from: number
  to: number
  projectId?: string
  kinds: Array<(typeof CALENDAR_ENTRY_KINDS)[number]> | null
}

export const calendarQuerySchema = z
  .strictObject({
    from: z.coerce.number().int().nonnegative(),
    to: z.coerce.number().int().nonnegative(),
    projectId: z.string().trim().min(1).optional(),
    kinds: calendarKindListSchema.optional(),
  })
  .refine((data) => data.to >= data.from, {
    message: 'Query param to must be at or after from',
  })

export function parseCalendarQuery(input: {
  from?: unknown
  to?: unknown
  projectId?: unknown
  kinds?: unknown
}): CalendarQuery {
  const parsed = calendarQuerySchema.parse(input)
  return {
    from: parsed.from,
    to: parsed.to,
    projectId: parsed.projectId,
    kinds: parsed.kinds ?? null,
  }
}

export const myWorkQuerySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type MyWorkQuery = z.infer<typeof myWorkQuerySchema>


