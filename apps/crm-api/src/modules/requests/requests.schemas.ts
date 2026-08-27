import { z } from 'zod'

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])

export const requestPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

export const requestSourceSchema = z.enum([
  'CRM',
  'EMAIL',
  'PHONE',
  'CHAT',
  'WEB',
  'API',
  'OTHER',
])

/**
 * A timestamp on the wire.
 *
 * Unix **seconds**, never an ISO string and never milliseconds — the platform
 * contract (`.claude/rules/express-api.md`) makes every timestamp seconds in
 * both directions, and these fields serialize that way on the way out. Taking
 * an ISO string on the way in left the same field with two different types
 * depending on which way it was travelling.
 */
const unixSecondsSchema = z.number().int()

export const organizationParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
})

export const requestParamsSchema = organizationParamsSchema.extend({
  id: z.string().min(1),
})

export const listRequestsQuerySchema = z.object({
  status: requestStatusSchema.optional(),
  teamId: z.string().trim().optional(),
  assigneeId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  subcategoryId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  priority: requestPrioritySchema.optional(),
})

export const createRequestBodySchema = z.object({
  customerId: z.string().min(1),
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
  priority: requestPrioritySchema.optional(),
  source: requestSourceSchema.optional(),
  teamId: z.string().trim().max(160).nullable().optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  createdBy: z.string().min(1),
})

export const updateRequestBodySchema = z
  .object({
    subject: z.string().trim().min(1).max(240).optional(),
    categoryId: z.string().trim().max(160).nullable().optional(),
    subcategoryId: z.string().trim().max(160).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
    status: requestStatusSchema.optional(),
    priority: requestPrioritySchema.optional(),
    source: requestSourceSchema.optional(),
    teamId: z.string().trim().max(160).nullable().optional(),
    assigneeId: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deleteRequestBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})

export const requestNoteParamsSchema = requestParamsSchema.extend({
  noteId: z.string().min(1),
})

export const createRequestNoteBodySchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  authorId: z.string().min(1),
  internal: z.boolean().optional(),
})

export const deleteRequestNoteBodySchema = z.object({
  deletedBy: z.string().min(1),
})

export const updateRequestNoteBodySchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  editedBy: z.string().min(1),
})

export const taskParamsSchema = requestParamsSchema.extend({
  taskId: z.string().min(1),
})
export const reminderParamsSchema = requestParamsSchema.extend({
  reminderId: z.string().min(1),
})
export const createTaskBodySchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: requestPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueAt: unixSecondsSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  createdBy: z.string().min(1),
})
export const updateTaskBodySchema = createTaskBodySchema
  .omit({ createdBy: true })
  .extend({ completedBy: z.string().nullable().optional() })
  .partial()
  .refine((x) => Object.keys(x).length > 0)
export const createReminderBodySchema = z.object({
  title: z.string().trim().min(1).max(240),
  note: z.string().trim().max(10_000).nullable().optional(),
  remindAt: unixSecondsSchema,
  userId: z.string().min(1),
  status: z.enum(['SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED']).optional(),
  createdBy: z.string().min(1),
})
export const updateReminderBodySchema = createReminderBodySchema
  .omit({ createdBy: true })
  .partial()
  .refine((x) => Object.keys(x).length > 0)
export const deleteNestedBodySchema = z.object({ deletedBy: z.string().min(1) })
