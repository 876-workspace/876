import { z } from 'zod'

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])

export const requestPrioritySchema = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
])

export const requestCategorySchema = z.enum([
  'GENERAL',
  'SUPPORT',
  'BILLING',
  'SALES',
  'COMPLAINT',
  'FEEDBACK',
  'OTHER',
])

export const requestSourceSchema = z.enum([
  'CRM',
  'EMAIL',
  'PHONE',
  'CHAT',
  'WEB',
  'API',
  'OTHER',
])

export const organizationParamsSchema = z.object({
  organizationId: z.string().min(1),
})

export const requestParamsSchema = organizationParamsSchema.extend({
  id: z.string().min(1),
})

export const createRequestBodySchema = z.object({
  customerId: z.string().min(1),
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  category: requestCategorySchema.optional(),
  priority: requestPrioritySchema.optional(),
  source: requestSourceSchema.optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  createdBy: z.string().min(1),
})

export const updateRequestBodySchema = z
  .object({
    subject: z.string().trim().min(1).max(240).optional(),
    category: requestCategorySchema.optional(),
    status: requestStatusSchema.optional(),
    priority: requestPrioritySchema.optional(),
    source: requestSourceSchema.optional(),
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
