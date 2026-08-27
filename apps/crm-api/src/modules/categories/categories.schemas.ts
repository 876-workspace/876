import { z } from 'zod'
export const org = z.object({ organizationId: z.string().min(1) })
export const category = org.extend({ id: z.string().min(1) })
export const subcategory = category.extend({ subcategoryId: z.string().min(1) })
const base = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
  // Icon keys are presentation-owned; accepting unknown saved keys keeps old rows editable.
  icon: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  defaultTeamId: z.string().nullable().optional(),
  defaultPriority: z
    .enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .nullable()
    .optional(),
})
export const create = base.extend({ createdBy: z.string().min(1) })
export const update = base.partial().refine((x) => Object.keys(x).length > 0)
export const deletion = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().optional(),
})
