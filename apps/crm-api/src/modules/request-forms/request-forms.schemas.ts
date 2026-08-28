import { z } from 'zod'

import {
  createRequestFormInputSchema,
  requestFormStatusSchema,
  submitRequestFormInputSchema,
  updateRequestFormInputSchema,
} from '../../types/request-form.js'

export const requestFormOrganizationParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
})

export const requestFormParamsSchema =
  requestFormOrganizationParamsSchema.extend({
    id: z.string().trim().min(1),
  })

export const listRequestFormsQuerySchema = z.object({
  status: requestFormStatusSchema.optional(),
})

export const createRequestFormBodySchema = createRequestFormInputSchema
export const updateRequestFormBodySchema = updateRequestFormInputSchema
export const submitRequestFormBodySchema = submitRequestFormInputSchema

export const deleteRequestFormBodySchema = z.object({
  deletedBy: z.string().trim().min(1).max(160),
  reason: z.string().trim().max(300).nullable().optional(),
})

export const listFormCustomerRequestsQuerySchema = z
  .object({
    customerOrganizationId: z.string().trim().min(1).max(160).optional(),
    customerUserId: z.string().trim().min(1).max(160).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.customerOrganizationId) !== Boolean(value.customerUserId),
    {
      message: 'Provide exactly one customerOrganizationId or customerUserId.',
    }
  )
