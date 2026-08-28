import { z } from 'zod'

export const org = z.strictObject({ organizationId: z.string().trim().min(1) })
export const category = org.extend({ id: z.string().trim().min(1) })
export const subcategory = category.extend({
  subcategoryId: z.string().trim().min(1),
})

const base = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
  // Icon keys are presentation-owned; accepting unknown saved keys keeps old rows editable.
  icon: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  defaultTeamId: z.string().trim().min(1).nullable().optional(),
  defaultPriorityId: z.string().trim().min(1).nullable().optional(),
})

export const create = base.extend({ createdBy: z.string().trim().min(1) })
export const update = base
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
export const deletion = z.strictObject({
  deletedBy: z.string().trim().min(1),
  reason: z.string().trim().max(300).optional(),
})
