import { z } from 'zod'

export const TIME_APPROVAL_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const

export const TIMESHEET_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const

export const TIME_SUMMARY_GROUPS = [
  'project',
  'user',
  'issue',
  'day',
] as const

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const timeEntryParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  timeEntryId: z.string().trim().min(1),
})

export const timesheetParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  timesheetId: z.string().trim().min(1),
})

const queryBooleanSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => (typeof value === 'string' ? value === 'true' : value))

export const createTimeEntryBodySchema = z
  .strictObject({
    userId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    issueId: z.string().trim().min(1).nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    taskListId: z.string().trim().min(1).nullable().optional(),
    startedAt: z.number().int().nonnegative(),
    endedAt: z.number().int().nonnegative(),
    durationMinutes: z.number().int().min(0).max(525600).optional(),
    billable: z.boolean().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    createdBy: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => data.endedAt >= data.startedAt, {
    message: 'endedAt must be at or after startedAt',
  })

export type CreateTimeEntryBody = z.infer<typeof createTimeEntryBodySchema>

export const updateTimeEntryBodySchema = z
  .strictObject({
    userId: z.string().trim().min(1),
    projectId: z.string().trim().min(1).optional(),
    issueId: z.string().trim().min(1).nullable().optional(),
    milestoneId: z.string().trim().min(1).nullable().optional(),
    taskListId: z.string().trim().min(1).nullable().optional(),
    startedAt: z.number().int().nonnegative().optional(),
    endedAt: z.number().int().nonnegative().nullable().optional(),
    durationMinutes: z.number().int().min(0).max(525600).nullable().optional(),
    billable: z.boolean().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'userId'), {
    message: 'At least one field besides userId must be provided for update',
  })

export type UpdateTimeEntryBody = z.infer<typeof updateTimeEntryBodySchema>

export const deleteTimeEntryQuerySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type DeleteTimeEntryQuery = z.infer<typeof deleteTimeEntryQuerySchema>

export const listTimeEntriesQuerySchema = z
  .strictObject({
    userId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    issueId: z.string().trim().min(1).optional(),
    from: z.coerce.number().int().nonnegative().optional(),
    to: z.coerce.number().int().nonnegative().optional(),
    billable: queryBooleanSchema.optional(),
    approvalStatus: z.enum(TIME_APPROVAL_STATUSES).optional(),
  })
  .refine(
    (data) => data.from === undefined || data.to === undefined || data.to >= data.from,
    { message: 'Query param to must be at or after from' }
  )

export type ListTimeEntriesQuery = z.infer<typeof listTimeEntriesQuerySchema>

export const startTimerBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  issueId: z.string().trim().min(1).nullable().optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  taskListId: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  billable: z.boolean().optional(),
  startedAt: z.number().int().nonnegative().optional(),
})

export type StartTimerBody = z.infer<typeof startTimerBodySchema>

export const stopTimerBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  endedAt: z.number().int().nonnegative().optional(),
})

export type StopTimerBody = z.infer<typeof stopTimerBodySchema>

export const currentTimerQuerySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type CurrentTimerQuery = z.infer<typeof currentTimerQuerySchema>

export const createTimesheetBodySchema = z
  .strictObject({
    userId: z.string().trim().min(1),
    periodStart: z.number().int().nonnegative(),
    periodEnd: z.number().int().nonnegative(),
    note: z.string().trim().max(2000).nullable().optional(),
    entryIds: z.array(z.string().trim().min(1)).max(500).optional(),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: 'periodEnd must be at or after periodStart',
  })

export type CreateTimesheetBody = z.infer<typeof createTimesheetBodySchema>

export const listTimesheetsQuerySchema = z.strictObject({
  userId: z.string().trim().min(1).optional(),
  status: z.enum(TIMESHEET_STATUSES).optional(),
})

export type ListTimesheetsQuery = z.infer<typeof listTimesheetsQuerySchema>

export const submitTimesheetBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type SubmitTimesheetBody = z.infer<typeof submitTimesheetBodySchema>

export const recallTimesheetBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
})

export type RecallTimesheetBody = z.infer<typeof recallTimesheetBodySchema>

export const approveTimesheetBodySchema = z.strictObject({
  decidedBy: z.string().trim().min(1),
  note: z.string().trim().max(2000).nullable().optional(),
})

export type ApproveTimesheetBody = z.infer<typeof approveTimesheetBodySchema>

export const rejectTimesheetBodySchema = z.strictObject({
  decidedBy: z.string().trim().min(1),
  note: z.string().trim().min(1).max(2000),
})

export type RejectTimesheetBody = z.infer<typeof rejectTimesheetBodySchema>

export const timeSummaryQuerySchema = z
  .strictObject({
    groupBy: z.enum(TIME_SUMMARY_GROUPS),
    from: z.coerce.number().int().nonnegative(),
    to: z.coerce.number().int().nonnegative(),
    userId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    issueId: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.to >= data.from, {
    message: 'Query param to must be at or after from',
  })

export type TimeSummaryQuery = z.infer<typeof timeSummaryQuerySchema>
