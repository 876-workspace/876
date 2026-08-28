import { z } from 'zod'

import { optionalRichContentSchema } from '../../types/rich-content.js'

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
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

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const requestParamsSchema = organizationParamsSchema.extend({
  id: z.string().trim().min(1),
})

export const listRequestsQuerySchema = z.strictObject({
  status: requestStatusSchema.optional(),
  teamId: z.string().trim().optional(),
  assigneeId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  subcategoryId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  requesterUserId: z.string().trim().optional(),
  priorityId: z.string().trim().optional(),
})

export const createRequestBodySchema = z.strictObject({
  customerId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(240),
  description: optionalRichContentSchema(20_000),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
  priorityId: z.string().trim().max(160).optional(),
  source: requestSourceSchema.optional(),
  teamId: z.string().trim().max(160).nullable().optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  requesterUserId: z.string().trim().max(160).nullable().optional(),
  requesterContactId: z.string().trim().max(160).nullable().optional(),
  createdBy: z.string().trim().min(1),
})

export const updateRequestBodySchema = z
  .strictObject({
    subject: z.string().trim().min(1).max(240).optional(),
    categoryId: z.string().trim().max(160).nullable().optional(),
    subcategoryId: z.string().trim().max(160).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
    status: requestStatusSchema.optional(),
    priorityId: z.string().trim().max(160).optional(),
    source: requestSourceSchema.optional(),
    teamId: z.string().trim().max(160).nullable().optional(),
    assigneeId: z.string().trim().max(160).nullable().optional(),
    requesterUserId: z.string().trim().max(160).nullable().optional(),
    requesterContactId: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deleteRequestBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})
