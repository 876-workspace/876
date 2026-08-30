import { z } from 'zod'

export const WORK_SERVICE_KEY = 'work' as const

const titleSchema = z.string().trim().min(1).max(240)
const longTextSchema = z.string().max(10_000)
const idSchema = z.string().trim().min(1)
const unixSchema = z.number().int()
const timeZoneSchema = z.string().trim().min(1).max(120)
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const durationSchema = z.string().trim().min(2).max(64).startsWith('P')

export const workContextSchema = z.strictObject({
  service: idSchema,
  resource: idSchema,
  id: idSchema,
})
export type WorkContext = z.infer<typeof workContextSchema>

export const workTaskStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'DEFERRED',
  'DONE',
  'CANCELLED',
  'FAILED',
])
export type WorkTaskStatus = z.infer<typeof workTaskStatusSchema>

export const workTaskImportanceSchema = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
])
export type WorkTaskImportance = z.infer<typeof workTaskImportanceSchema>

export const workAssignmentTargetTypeSchema = z.enum(['USER', 'TEAM'])
export type WorkAssignmentTargetType = z.infer<
  typeof workAssignmentTargetTypeSchema
>

export const workAssignmentRoleSchema = z.enum([
  'OWNER',
  'COLLABORATOR',
  'REVIEWER',
  'WATCHER',
])
export type WorkAssignmentRole = z.infer<typeof workAssignmentRoleSchema>

export const workAssignmentStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
])
export type WorkAssignmentStatus = z.infer<typeof workAssignmentStatusSchema>

export const workReminderStatusSchema = z.enum([
  'SCHEDULED',
  'SENT',
  'DISMISSED',
  'CANCELLED',
])
export type WorkReminderStatus = z.infer<typeof workReminderStatusSchema>

export const workRecurrenceFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
])
export type WorkRecurrenceFrequency = z.infer<
  typeof workRecurrenceFrequencySchema
>

export const workWeekdaySchema = z.enum([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
])
export type WorkWeekday = z.infer<typeof workWeekdaySchema>

export const workAlertTriggerTypeSchema = z.enum(['ABSOLUTE', 'RELATIVE'])
export const workAlertActionSchema = z.enum(['NOTIFICATION', 'EMAIL'])
export const workAlertStatusSchema = z.enum([
  'SCHEDULED',
  'SENT',
  'DISMISSED',
  'CANCELLED',
])

export const workCalendarVisibilitySchema = z.enum(['PRIVATE', 'ORGANIZATION'])
export const workCalendarRoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER'])
export const workEventStatusSchema = z.enum([
  'CONFIRMED',
  'TENTATIVE',
  'CANCELLED',
])
export const workEventBusyStatusSchema = z.enum(['BUSY', 'FREE'])
export const workParticipantKindSchema = z.enum(['USER', 'EMAIL'])
export const workParticipantRoleSchema = z.enum([
  'CHAIR',
  'REQUIRED',
  'OPTIONAL',
])
export const workParticipantStatusSchema = z.enum([
  'NEEDS_ACTION',
  'ACCEPTED',
  'DECLINED',
  'TENTATIVE',
  'DELEGATED',
])

export const workSyncProviderSchema = z.enum([
  'ICALENDAR',
  'GOOGLE',
  'MICROSOFT',
  'CALDAV',
])
export const workSyncConnectionStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'REVOKED',
  'ERROR',
])
export const workSyncResourceTypeSchema = z.enum([
  'TASK',
  'TASK_LIST',
  'CALENDAR',
  'EVENT',
])

export const workTenantSchema = z.object({
  object: z.literal('work_tenant'),
  id: z.string(),
  organizationId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkTenant = z.infer<typeof workTenantSchema>

export const workTaskLinkSchema = z.object({
  object: z.literal('task_link'),
  id: z.string(),
  taskId: z.string(),
  service: z.string(),
  resource: z.string(),
  externalId: z.string(),
  label: z.string().nullable(),
  url: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: unixSchema,
})
export type WorkTaskLink = z.infer<typeof workTaskLinkSchema>

export const workTaskAssignmentSchema = z.object({
  object: z.literal('task_assignment'),
  id: z.string(),
  taskId: z.string(),
  targetType: workAssignmentTargetTypeSchema,
  assigneeId: z.string(),
  role: workAssignmentRoleSchema,
  status: workAssignmentStatusSchema,
  assignedBy: z.string(),
  assignedAt: unixSchema,
  respondedAt: unixSchema.nullable(),
  completedAt: unixSchema.nullable(),
  delegatedFromAssignmentId: z.string().nullable(),
})
export type WorkTaskAssignment = z.infer<typeof workTaskAssignmentSchema>

export const workTaskListResourceSchema = z.object({
  object: z.literal('task_list'),
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkTaskList = z.infer<typeof workTaskListResourceSchema>

export const workRecurrenceRuleSchema = z.object({
  object: z.literal('recurrence_rule'),
  id: z.string(),
  organizationId: z.string(),
  frequency: workRecurrenceFrequencySchema,
  interval: z.number().int().min(1),
  byDay: z.array(workWeekdaySchema),
  byMonthDay: z.array(
    z
      .number()
      .int()
      .min(-31)
      .max(31)
      .refine((value) => value !== 0)
  ),
  byMonth: z.array(z.number().int().min(1).max(12)),
  count: z.number().int().min(1).nullable(),
  untilAt: unixSchema.nullable(),
  timeZone: z.string(),
  weekStart: workWeekdaySchema.nullable(),
  rrule: z.string(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkRecurrenceRule = z.infer<typeof workRecurrenceRuleSchema>

export const workTaskSchema = z.object({
  object: z.literal('task'),
  id: z.string(),
  uid: z.string(),
  organizationId: z.string(),
  listId: z.string(),
  parentTaskId: z.string().nullable(),
  context: workContextSchema.nullable(),
  links: z.array(workTaskLinkSchema),
  title: z.string(),
  description: z.string().nullable(),
  status: workTaskStatusSchema,
  importance: workTaskImportanceSchema,
  priorityId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assignments: z.array(workTaskAssignmentSchema),
  startAt: unixSchema.nullable(),
  startTimeZone: z.string().nullable(),
  dueAt: unixSchema.nullable(),
  dueTimeZone: z.string().nullable(),
  estimatedDuration: z.string().nullable(),
  percentComplete: z.number().int().min(0).max(100),
  recurrenceRuleId: z.string().nullable(),
  completedAt: unixSchema.nullable(),
  completedBy: z.string().nullable(),
  isOverdue: z.boolean(),
  sortOrder: z.number().int(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkTask = z.infer<typeof workTaskSchema>

function validateTimePair(
  value: {
    startAt?: number | null
    startTimeZone?: string | null
    dueAt?: number | null
    dueTimeZone?: string | null
  },
  context: z.RefinementCtx
) {
  if ((value.startAt == null) !== (value.startTimeZone == null))
    context.addIssue({
      code: 'custom',
      path: ['startAt'],
      message: 'startAt and startTimeZone must be supplied together.',
    })
  if ((value.dueAt == null) !== (value.dueTimeZone == null))
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'dueAt and dueTimeZone must be supplied together.',
    })
  if (
    value.startAt != null &&
    value.dueAt != null &&
    value.dueAt < value.startAt
  )
    context.addIssue({
      code: 'custom',
      path: ['dueAt'],
      message: 'dueAt cannot be before startAt.',
    })
}

export const createWorkTaskInputSchema = z
  .strictObject({
    context: workContextSchema.optional().nullable(),
    listId: idSchema.optional(),
    parentTaskId: idSchema.optional().nullable(),
    title: titleSchema,
    description: longTextSchema.optional().nullable(),
    status: workTaskStatusSchema.optional(),
    importance: workTaskImportanceSchema.optional(),
    priorityId: idSchema.optional().nullable(),
    assigneeId: idSchema.optional().nullable(),
    startAt: unixSchema.optional().nullable(),
    startTimeZone: timeZoneSchema.optional().nullable(),
    dueAt: unixSchema.optional().nullable(),
    dueTimeZone: timeZoneSchema.optional().nullable(),
    estimatedDuration: durationSchema.optional().nullable(),
    percentComplete: z.number().int().min(0).max(100).optional(),
    recurrenceRuleId: idSchema.optional().nullable(),
    sortOrder: z.number().int().optional(),
    createdBy: idSchema,
  })
  .superRefine(validateTimePair)
export type CreateWorkTaskInput = z.infer<typeof createWorkTaskInputSchema>

export const updateWorkTaskInputSchema = z
  .strictObject({
    context: workContextSchema.optional().nullable(),
    listId: idSchema.optional(),
    parentTaskId: idSchema.optional().nullable(),
    title: titleSchema.optional(),
    description: longTextSchema.optional().nullable(),
    status: workTaskStatusSchema.optional(),
    importance: workTaskImportanceSchema.optional(),
    priorityId: idSchema.optional().nullable(),
    assigneeId: idSchema.optional().nullable(),
    startAt: unixSchema.optional().nullable(),
    startTimeZone: timeZoneSchema.optional().nullable(),
    dueAt: unixSchema.optional().nullable(),
    dueTimeZone: timeZoneSchema.optional().nullable(),
    estimatedDuration: durationSchema.optional().nullable(),
    percentComplete: z.number().int().min(0).max(100).optional(),
    recurrenceRuleId: idSchema.optional().nullable(),
    sortOrder: z.number().int().optional(),
    completedBy: idSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkTaskInput = z.infer<typeof updateWorkTaskInputSchema>

export const createWorkTaskListInputSchema = z.strictObject({
  name: titleSchema,
  description: longTextSchema.optional().nullable(),
  ownerUserId: idSchema.optional().nullable(),
  sortOrder: z.number().int().optional(),
  createdBy: idSchema,
})
export type CreateWorkTaskListInput = z.infer<
  typeof createWorkTaskListInputSchema
>

export const updateWorkTaskListInputSchema = z
  .strictObject({
    name: titleSchema.optional(),
    description: longTextSchema.optional().nullable(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkTaskListInput = z.infer<
  typeof updateWorkTaskListInputSchema
>

export const createWorkTaskLinkInputSchema = z.strictObject({
  service: idSchema,
  resource: idSchema,
  externalId: idSchema,
  label: z.string().trim().max(240).optional().nullable(),
  url: z.url().optional().nullable(),
  isPrimary: z.boolean().optional(),
})
export type CreateWorkTaskLinkInput = z.infer<
  typeof createWorkTaskLinkInputSchema
>

export const createWorkTaskAssignmentInputSchema = z.strictObject({
  targetType: workAssignmentTargetTypeSchema,
  assigneeId: idSchema,
  role: workAssignmentRoleSchema.optional(),
  status: workAssignmentStatusSchema.optional(),
  assignedBy: idSchema,
  delegatedFromAssignmentId: idSchema.optional().nullable(),
})
export type CreateWorkTaskAssignmentInput = z.infer<
  typeof createWorkTaskAssignmentInputSchema
>

export const updateWorkTaskAssignmentInputSchema = z
  .strictObject({
    role: workAssignmentRoleSchema.optional(),
    status: workAssignmentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkTaskAssignmentInput = z.infer<
  typeof updateWorkTaskAssignmentInputSchema
>

/**
 * The unrefined recurrence shape. Both the create and update contracts derive
 * from it, because `.omit()` is unavailable on a schema that already carries a
 * refinement.
 */
const workRecurrenceRuleShapeSchema = z.strictObject({
  frequency: workRecurrenceFrequencySchema,
  interval: z.number().int().min(1).optional(),
  byDay: z.array(workWeekdaySchema).optional(),
  byMonthDay: z
    .array(
      z
        .number()
        .int()
        .min(-31)
        .max(31)
        .refine((value) => value !== 0)
    )
    .optional(),
  byMonth: z.array(z.number().int().min(1).max(12)).optional(),
  count: z.number().int().min(1).optional().nullable(),
  untilAt: unixSchema.optional().nullable(),
  timeZone: timeZoneSchema,
  weekStart: workWeekdaySchema.optional().nullable(),
  createdBy: idSchema,
})

const COUNT_AND_UNTIL_ARE_EXCLUSIVE = {
  message: 'count and untilAt are mutually exclusive.',
} as const

export const createWorkRecurrenceRuleInputSchema =
  workRecurrenceRuleShapeSchema.refine(
    (value) => !(value.count != null && value.untilAt != null),
    COUNT_AND_UNTIL_ARE_EXCLUSIVE
  )
export type CreateWorkRecurrenceRuleInput = z.infer<
  typeof createWorkRecurrenceRuleInputSchema
>

export const updateWorkRecurrenceRuleInputSchema = workRecurrenceRuleShapeSchema
  .omit({ createdBy: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
  .refine(
    (value) => !(value.count != null && value.untilAt != null),
    COUNT_AND_UNTIL_ARE_EXCLUSIVE
  )
export type UpdateWorkRecurrenceRuleInput = z.infer<
  typeof updateWorkRecurrenceRuleInputSchema
>

export const workReminderSchema = z.object({
  object: z.literal('reminder'),
  id: z.string(),
  organizationId: z.string(),
  context: workContextSchema.nullable(),
  title: z.string(),
  note: z.string().nullable(),
  remindAt: unixSchema,
  timeZone: z.string().nullable(),
  recurrenceRuleId: z.string().nullable(),
  userId: z.string(),
  status: workReminderStatusSchema,
  sentAt: unixSchema.nullable(),
  dismissedAt: unixSchema.nullable(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkReminder = z.infer<typeof workReminderSchema>

export const createWorkReminderInputSchema = z.strictObject({
  context: workContextSchema.optional().nullable(),
  title: titleSchema,
  note: longTextSchema.optional().nullable(),
  remindAt: unixSchema,
  timeZone: timeZoneSchema.optional().nullable(),
  recurrenceRuleId: idSchema.optional().nullable(),
  userId: idSchema,
  status: workReminderStatusSchema.optional(),
  createdBy: idSchema,
})
export type CreateWorkReminderInput = z.infer<
  typeof createWorkReminderInputSchema
>

export const updateWorkReminderInputSchema = z
  .strictObject({
    context: workContextSchema.optional().nullable(),
    title: titleSchema.optional(),
    note: longTextSchema.optional().nullable(),
    remindAt: unixSchema.optional(),
    timeZone: timeZoneSchema.optional().nullable(),
    recurrenceRuleId: idSchema.optional().nullable(),
    userId: idSchema.optional(),
    status: workReminderStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkReminderInput = z.infer<
  typeof updateWorkReminderInputSchema
>

export const workAlertSchema = z.object({
  object: z.literal('alert'),
  id: z.string(),
  organizationId: z.string(),
  taskId: z.string().nullable(),
  eventId: z.string().nullable(),
  userId: z.string(),
  triggerType: workAlertTriggerTypeSchema,
  triggerAt: unixSchema.nullable(),
  offsetSeconds: z.number().int().nullable(),
  action: workAlertActionSchema,
  status: workAlertStatusSchema,
  sentAt: unixSchema.nullable(),
  dismissedAt: unixSchema.nullable(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkAlert = z.infer<typeof workAlertSchema>

export const createWorkAlertInputSchema = z
  .strictObject({
    taskId: idSchema.optional().nullable(),
    eventId: idSchema.optional().nullable(),
    userId: idSchema,
    triggerType: workAlertTriggerTypeSchema,
    triggerAt: unixSchema.optional().nullable(),
    offsetSeconds: z.number().int().optional().nullable(),
    action: workAlertActionSchema.optional(),
    createdBy: idSchema,
  })
  .superRefine((value, context) => {
    if (Number(Boolean(value.taskId)) + Number(Boolean(value.eventId)) !== 1)
      context.addIssue({
        code: 'custom',
        message: 'Exactly one of taskId or eventId is required.',
      })
    const absolute = value.triggerType === 'ABSOLUTE'
    if (
      absolute !== (value.triggerAt != null) ||
      absolute === (value.offsetSeconds != null)
    )
      context.addIssue({
        code: 'custom',
        message:
          'Absolute alerts require triggerAt; relative alerts require offsetSeconds.',
      })
  })
export type CreateWorkAlertInput = z.infer<typeof createWorkAlertInputSchema>

export const updateWorkAlertInputSchema = z
  .strictObject({
    triggerType: workAlertTriggerTypeSchema.optional(),
    triggerAt: unixSchema.optional().nullable(),
    offsetSeconds: z.number().int().optional().nullable(),
    action: workAlertActionSchema.optional(),
    status: workAlertStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkAlertInput = z.infer<typeof updateWorkAlertInputSchema>

export const workCalendarSchema = z.object({
  object: z.literal('calendar'),
  id: z.string(),
  uid: z.string(),
  organizationId: z.string(),
  ownerUserId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  timeZone: z.string(),
  visibility: workCalendarVisibilitySchema,
  isPrimary: z.boolean(),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkCalendar = z.infer<typeof workCalendarSchema>

export const createWorkCalendarInputSchema = z.strictObject({
  ownerUserId: idSchema.optional().nullable(),
  name: titleSchema,
  description: longTextSchema.optional().nullable(),
  timeZone: timeZoneSchema,
  visibility: workCalendarVisibilitySchema.optional(),
  createdBy: idSchema,
})
export type CreateWorkCalendarInput = z.infer<
  typeof createWorkCalendarInputSchema
>

export const updateWorkCalendarInputSchema = z
  .strictObject({
    name: titleSchema.optional(),
    description: longTextSchema.optional().nullable(),
    timeZone: timeZoneSchema.optional(),
    visibility: workCalendarVisibilitySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkCalendarInput = z.infer<
  typeof updateWorkCalendarInputSchema
>

export const workCalendarSubscriptionSchema = z.object({
  object: z.literal('calendar_subscription'),
  id: z.string(),
  organizationId: z.string(),
  calendarId: z.string(),
  userId: z.string(),
  role: workCalendarRoleSchema,
  color: z.string().nullable(),
  isVisible: z.boolean(),
  defaultReminderMinutes: z.array(z.number().int().min(0)),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkCalendarSubscription = z.infer<
  typeof workCalendarSubscriptionSchema
>

export const createWorkCalendarSubscriptionInputSchema = z.strictObject({
  userId: idSchema,
  role: workCalendarRoleSchema.optional(),
  color: z.string().trim().max(40).optional().nullable(),
  isVisible: z.boolean().optional(),
  defaultReminderMinutes: z.array(z.number().int().min(0)).optional(),
})
export type CreateWorkCalendarSubscriptionInput = z.infer<
  typeof createWorkCalendarSubscriptionInputSchema
>

export const updateWorkCalendarSubscriptionInputSchema =
  createWorkCalendarSubscriptionInputSchema
    .omit({ userId: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'Provide at least one field to update.',
    })
export type UpdateWorkCalendarSubscriptionInput = z.infer<
  typeof updateWorkCalendarSubscriptionInputSchema
>

export const workEventParticipantSchema = z.object({
  object: z.literal('event_participant'),
  id: z.string(),
  eventId: z.string(),
  kind: workParticipantKindSchema,
  participantId: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: workParticipantRoleSchema,
  status: workParticipantStatusSchema,
  delegatedTo: z.string().nullable(),
  delegatedFrom: z.string().nullable(),
  respondedAt: unixSchema.nullable(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkEventParticipant = z.infer<typeof workEventParticipantSchema>

export const createWorkEventParticipantInputSchema = z
  .strictObject({
    kind: workParticipantKindSchema,
    participantId: idSchema.optional().nullable(),
    email: z.email().optional().nullable(),
    name: z.string().trim().max(240).optional().nullable(),
    role: workParticipantRoleSchema.optional(),
    status: workParticipantStatusSchema.optional(),
    delegatedTo: idSchema.optional().nullable(),
    delegatedFrom: idSchema.optional().nullable(),
  })
  .superRefine((value, context) => {
    const userShape =
      value.kind === 'USER' && Boolean(value.participantId) && !value.email
    const emailShape =
      value.kind === 'EMAIL' && !value.participantId && Boolean(value.email)
    if (!userShape && !emailShape)
      context.addIssue({
        code: 'custom',
        message:
          'USER participants require participantId; EMAIL participants require email.',
      })
  })
export type CreateWorkEventParticipantInput = z.infer<
  typeof createWorkEventParticipantInputSchema
>

export const updateWorkEventParticipantInputSchema = z
  .strictObject({
    name: z.string().trim().max(240).optional().nullable(),
    role: workParticipantRoleSchema.optional(),
    status: workParticipantStatusSchema.optional(),
    delegatedTo: idSchema.optional().nullable(),
    delegatedFrom: idSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkEventParticipantInput = z.infer<
  typeof updateWorkEventParticipantInputSchema
>

export const workEventSchema = z.object({
  object: z.literal('event'),
  id: z.string(),
  uid: z.string(),
  organizationId: z.string(),
  calendarId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  status: workEventStatusSchema,
  busyStatus: workEventBusyStatusSchema,
  allDay: z.boolean(),
  startAt: unixSchema.nullable(),
  endAt: unixSchema.nullable(),
  timeZone: z.string().nullable(),
  startDate: dateOnlySchema.nullable(),
  endDate: dateOnlySchema.nullable(),
  recurrenceRuleId: z.string().nullable(),
  recurrenceId: z.string().nullable(),
  participants: z.array(workEventParticipantSchema),
  createdBy: z.string(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkEvent = z.infer<typeof workEventSchema>

const eventBaseInputSchema = z.strictObject({
  calendarId: idSchema,
  title: titleSchema,
  description: longTextSchema.optional().nullable(),
  location: z.string().trim().max(1000).optional().nullable(),
  status: workEventStatusSchema.optional(),
  busyStatus: workEventBusyStatusSchema.optional(),
  recurrenceRuleId: idSchema.optional().nullable(),
  recurrenceId: idSchema.optional().nullable(),
  createdBy: idSchema,
})

export const createWorkEventInputSchema = z.union([
  eventBaseInputSchema
    .extend({
      allDay: z.literal(false),
      startAt: unixSchema,
      endAt: unixSchema,
      timeZone: timeZoneSchema,
    })
    .refine((value) => value.endAt > value.startAt, {
      path: ['endAt'],
      message: 'endAt must be after startAt.',
    }),
  eventBaseInputSchema
    .extend({
      allDay: z.literal(true),
      startDate: dateOnlySchema,
      endDate: dateOnlySchema,
    })
    .refine((value) => value.endDate > value.startDate, {
      path: ['endDate'],
      message: 'endDate must be after startDate.',
    }),
])
export type CreateWorkEventInput = z.infer<typeof createWorkEventInputSchema>

export const updateWorkEventInputSchema = z
  .strictObject({
    calendarId: idSchema.optional(),
    title: titleSchema.optional(),
    description: longTextSchema.optional().nullable(),
    location: z.string().trim().max(1000).optional().nullable(),
    status: workEventStatusSchema.optional(),
    busyStatus: workEventBusyStatusSchema.optional(),
    allDay: z.boolean().optional(),
    startAt: unixSchema.optional().nullable(),
    endAt: unixSchema.optional().nullable(),
    timeZone: timeZoneSchema.optional().nullable(),
    startDate: dateOnlySchema.optional().nullable(),
    endDate: dateOnlySchema.optional().nullable(),
    recurrenceRuleId: idSchema.optional().nullable(),
    recurrenceId: idSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkEventInput = z.infer<typeof updateWorkEventInputSchema>

export const workSyncConnectionSchema = z.object({
  object: z.literal('sync_connection'),
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  provider: workSyncProviderSchema,
  status: workSyncConnectionStatusSchema,
  credentialRef: z.string().nullable(),
  remoteAccountId: z.string().nullable(),
  remoteAccountLabel: z.string().nullable(),
  caldavUrl: z.string().nullable(),
  syncCursor: z.string().nullable(),
  lastSyncedAt: unixSchema.nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkSyncConnection = z.infer<typeof workSyncConnectionSchema>

export const createWorkSyncConnectionInputSchema = z.strictObject({
  userId: idSchema,
  provider: workSyncProviderSchema,
  credentialRef: idSchema.optional().nullable(),
  remoteAccountId: idSchema.optional().nullable(),
  remoteAccountLabel: z.string().trim().max(240).optional().nullable(),
  caldavUrl: z.url().optional().nullable(),
})
export type CreateWorkSyncConnectionInput = z.infer<
  typeof createWorkSyncConnectionInputSchema
>

export const updateWorkSyncConnectionInputSchema = z
  .strictObject({
    status: workSyncConnectionStatusSchema.optional(),
    credentialRef: idSchema.optional().nullable(),
    remoteAccountId: idSchema.optional().nullable(),
    remoteAccountLabel: z.string().trim().max(240).optional().nullable(),
    caldavUrl: z.url().optional().nullable(),
    syncCursor: z.string().optional().nullable(),
    lastErrorCode: z.string().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkSyncConnectionInput = z.infer<
  typeof updateWorkSyncConnectionInputSchema
>

export const workSyncMappingSchema = z.object({
  object: z.literal('sync_mapping'),
  id: z.string(),
  connectionId: z.string(),
  resourceType: workSyncResourceTypeSchema,
  localId: z.string(),
  remoteId: z.string(),
  remoteEtag: z.string().nullable(),
  iCalUid: z.string().nullable(),
  contentHash: z.string().nullable(),
  lastSyncedAt: unixSchema.nullable(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkSyncMapping = z.infer<typeof workSyncMappingSchema>

export const createWorkSyncMappingInputSchema = z.strictObject({
  resourceType: workSyncResourceTypeSchema,
  localId: idSchema,
  remoteId: idSchema,
  remoteEtag: z.string().optional().nullable(),
  iCalUid: z.string().optional().nullable(),
  contentHash: z.string().optional().nullable(),
})
export type CreateWorkSyncMappingInput = z.infer<
  typeof createWorkSyncMappingInputSchema
>

export const updateWorkSyncMappingInputSchema = z
  .strictObject({
    remoteId: idSchema.optional(),
    remoteEtag: z.string().optional().nullable(),
    iCalUid: z.string().optional().nullable(),
    contentHash: z.string().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export type UpdateWorkSyncMappingInput = z.infer<
  typeof updateWorkSyncMappingInputSchema
>

export const workCalendarExportSchema = z.object({
  object: z.literal('calendar_export'),
  format: z.enum(['ics', 'jscalendar']),
  filename: z.string(),
  contentType: z.string(),
  content: z.string(),
})
export type WorkCalendarExport = z.infer<typeof workCalendarExportSchema>

export const createWorkCalendarExportInputSchema = z.strictObject({
  format: z.enum(['ics', 'jscalendar']),
  calendarId: idSchema.optional(),
  taskListId: idSchema.optional(),
  includeTasks: z.boolean().optional(),
  includeEvents: z.boolean().optional(),
})
export type CreateWorkCalendarExportInput = z.infer<
  typeof createWorkCalendarExportInputSchema
>

export function workListSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    object: z.literal('list'),
    data: z.array(item),
    has_more: z.boolean(),
    total_count: z.number().int().nullable(),
    url: z.string(),
  })
}

export const workTaskListSchema = workListSchema(workTaskSchema)
export const workReminderListSchema = workListSchema(workReminderSchema)
export const workTaskListResourceListSchema = workListSchema(
  workTaskListResourceSchema
)
export const workTaskLinkListSchema = workListSchema(workTaskLinkSchema)
export const workTaskAssignmentListSchema = workListSchema(
  workTaskAssignmentSchema
)
export const workRecurrenceRuleListSchema = workListSchema(
  workRecurrenceRuleSchema
)
export const workAlertListSchema = workListSchema(workAlertSchema)
export const workCalendarListSchema = workListSchema(workCalendarSchema)
export const workCalendarSubscriptionListSchema = workListSchema(
  workCalendarSubscriptionSchema
)
export const workEventListSchema = workListSchema(workEventSchema)
export const workEventParticipantListSchema = workListSchema(
  workEventParticipantSchema
)
export const workSyncConnectionListSchema = workListSchema(
  workSyncConnectionSchema
)
export const workSyncMappingListSchema = workListSchema(workSyncMappingSchema)

export type WorkTaskListFilter = {
  context?: WorkContext
  listId?: string
  parentTaskId?: string | null
  priorityId?: string
  assigneeId?: string
  status?: WorkTaskStatus
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkTaskListResourceFilter = {
  ownerUserId?: string
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkReminderListFilter = {
  context?: WorkContext
  userId?: string
  status?: WorkReminderStatus
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkAlertListFilter = {
  taskId?: string
  eventId?: string
  userId?: string
  status?: z.infer<typeof workAlertStatusSchema>
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkCalendarListFilter = {
  userId?: string
  visibility?: z.infer<typeof workCalendarVisibilitySchema>
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkEventListFilter = {
  calendarId?: string
  from?: number
  to?: number
  status?: z.infer<typeof workEventStatusSchema>
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkSyncConnectionListFilter = {
  userId?: string
  provider?: z.infer<typeof workSyncProviderSchema>
  status?: z.infer<typeof workSyncConnectionStatusSchema>
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export type WorkResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }
