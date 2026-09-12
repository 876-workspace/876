import { z } from 'zod'

import { requestChannelSchema, requestStatusSchema } from '@876/crm/contracts'
import { optionalRichContentSchema } from '../../types/rich-content.js'

export { requestStatusSchema } from '@876/crm/contracts'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const requestParamsSchema = organizationParamsSchema.extend({
  id: z.string().trim().min(1),
})

export const billingCustomerRequestParamsSchema =
  organizationParamsSchema.extend({
    billingCustomerId: z.string().trim().min(1).max(160),
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
  relatedResourceType: z
    .enum(['invoice', 'payment', 'quote', 'credit-note'])
    .optional(),
  relatedResourceId: z.string().trim().min(1).max(160).optional(),
})

const relatedResourceSnapshotSchema = z
  .object({
    number: z.string().trim().max(160).optional(),
    amount: z.string().trim().max(160).optional(),
    currency: z.string().trim().max(16).optional(),
    status: z.string().trim().max(80).optional(),
  })
  .strict()

export const listAcrossOrganizationsRequestsQuerySchema = z.strictObject({
  status: requestStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  starting_after: z.string().trim().min(1).optional(),
})

const createRequestBodyFieldsSchema = z.strictObject({
  customerId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(240),
  description: optionalRichContentSchema(20_000),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
  priorityId: z.string().trim().max(160).optional(),
  channel: requestChannelSchema.optional(),
  teamId: z.string().trim().max(160).nullable().optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  requesterUserId: z.string().trim().max(160).nullable().optional(),
  requesterContactId: z.string().trim().max(160).nullable().optional(),
  relatedResourceType: z
    .enum(['invoice', 'payment', 'quote', 'credit-note'])
    .nullable()
    .optional(),
  relatedResourceId: z.string().trim().max(160).nullable().optional(),
  relatedResourceSnapshot: relatedResourceSnapshotSchema.nullable().optional(),
  createdBy: z.string().trim().min(1),
})

export const createRequestBodySchema = createRequestBodyFieldsSchema

export const createRequestForBillingCustomerBodySchema =
  createRequestBodyFieldsSchema.omit({ customerId: true })

export const updateRequestBodySchema = z
  .strictObject({
    subject: z.string().trim().min(1).max(240).optional(),
    categoryId: z.string().trim().max(160).nullable().optional(),
    subcategoryId: z.string().trim().max(160).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
    status: requestStatusSchema.optional(),
    priorityId: z.string().trim().max(160).optional(),
    channel: requestChannelSchema.optional(),
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
