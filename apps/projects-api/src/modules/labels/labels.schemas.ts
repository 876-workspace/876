import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const labelParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  labelId: z.string().trim().min(1),
})

export const createLabelBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
})

export const updateLabelBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(60).optional(),
    color: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export type CreateLabelBody = z.infer<typeof createLabelBodySchema>
export type UpdateLabelBody = z.infer<typeof updateLabelBodySchema>
