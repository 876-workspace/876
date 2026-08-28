import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const priorityParamsSchema = organizationParamsSchema.extend({
  priorityId: z.string().trim().min(1),
})

const priorityFields = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  weight: z.number().int().min(0).max(1_000_000).optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const createPriorityBodySchema = priorityFields.extend({
  createdBy: z.string().trim().min(1),
})

export const updatePriorityBodySchema = priorityFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deletePriorityBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})

export const listPrioritiesQuerySchema = z.strictObject({
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})
