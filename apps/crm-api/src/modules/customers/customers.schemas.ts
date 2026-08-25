import { z } from 'zod'

const nullableText = z.string().trim().max(160).nullable().optional()

export const organizationParamsSchema = z.object({ organizationId: z.string().min(1) })
export const customerParamsSchema = organizationParamsSchema.extend({ id: z.string().min(1) })

export const createCustomerBodySchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
  firstName: nullableText,
  lastName: nullableText,
  companyName: nullableText,
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
})

export const updateCustomerBodySchema = createCustomerBodySchema.omit({ idempotencyKey: true }).extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export const deleteCustomerBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerBodySchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerBodySchema>
