import { z } from 'zod'

export const WORK_SERVICE_KEY = 'work' as const

export const workContextSchema = z.strictObject({
  service: z.string().trim().min(1),
  resource: z.string().trim().min(1),
  id: z.string().trim().min(1),
})
export type WorkContext = z.infer<typeof workContextSchema>

export const workTaskStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
])
export type WorkTaskStatus = z.infer<typeof workTaskStatusSchema>

export const workReminderStatusSchema = z.enum([
  'SCHEDULED',
  'SENT',
  'DISMISSED',
  'CANCELLED',
])
export type WorkReminderStatus = z.infer<typeof workReminderStatusSchema>

export const workTenantSchema = z.object({
  object: z.literal('work_tenant'),
  id: z.string(),
  organizationId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WorkTenant = z.infer<typeof workTenantSchema>

export const workTaskSchema = z.object({
  object: z.literal('task'),
  id: z.string(),
  organizationId: z.string(),
  context: workContextSchema.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: workTaskStatusSchema,
  priorityId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  dueAt: z.number().int().nullable(),
  completedAt: z.number().int().nullable(),
  completedBy: z.string().nullable(),
  sortOrder: z.number().int(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WorkTask = z.infer<typeof workTaskSchema>

export const createWorkTaskInputSchema = z.strictObject({
  context: workContextSchema.optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  status: workTaskStatusSchema.optional(),
  priorityId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueAt: z.number().int().optional().nullable(),
  sortOrder: z.number().int().optional(),
  createdBy: z.string().trim().min(1),
})
export type CreateWorkTaskInput = z.infer<typeof createWorkTaskInputSchema>

export const updateWorkTaskInputSchema = z.strictObject({
  context: workContextSchema.optional().nullable(),
  title: z.string().trim().min(1).optional(),
  description: z.string().optional().nullable(),
  status: workTaskStatusSchema.optional(),
  priorityId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueAt: z.number().int().optional().nullable(),
  sortOrder: z.number().int().optional(),
  completedBy: z.string().optional().nullable(),
})
export type UpdateWorkTaskInput = z.infer<typeof updateWorkTaskInputSchema>

export const workReminderSchema = z.object({
  object: z.literal('reminder'),
  id: z.string(),
  organizationId: z.string(),
  context: workContextSchema.nullable(),
  title: z.string(),
  note: z.string().nullable(),
  remindAt: z.number().int(),
  userId: z.string(),
  status: workReminderStatusSchema,
  sentAt: z.number().int().nullable(),
  dismissedAt: z.number().int().nullable(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type WorkReminder = z.infer<typeof workReminderSchema>

export const createWorkReminderInputSchema = z.strictObject({
  context: workContextSchema.optional().nullable(),
  title: z.string().trim().min(1),
  note: z.string().optional().nullable(),
  remindAt: z.number().int(),
  userId: z.string().trim().min(1),
  status: workReminderStatusSchema.optional(),
  createdBy: z.string().trim().min(1),
})
export type CreateWorkReminderInput = z.infer<
  typeof createWorkReminderInputSchema
>

export const updateWorkReminderInputSchema = z.strictObject({
  context: workContextSchema.optional().nullable(),
  title: z.string().trim().min(1).optional(),
  note: z.string().optional().nullable(),
  remindAt: z.number().int().optional(),
  userId: z.string().trim().min(1).optional(),
  status: workReminderStatusSchema.optional(),
})
export type UpdateWorkReminderInput = z.infer<
  typeof updateWorkReminderInputSchema
>

export const workTaskListSchema = z.object({
  object: z.literal('list'),
  data: z.array(workTaskSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const workReminderListSchema = z.object({
  object: z.literal('list'),
  data: z.array(workReminderSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type WorkTaskListFilter = {
  context?: WorkContext
  priorityId?: string
}

export type WorkReminderListFilter = {
  context?: WorkContext
  userId?: string
}

export type WorkResult<T> = {
  data: T | null
  error: { code: string; message: string } | null
}
