import { z } from 'zod'
export const organizationParamsSchema = z.object({
  organizationId: z.string().min(1),
})
export const teamParamsSchema = organizationParamsSchema.extend({
  id: z.string().min(1),
})
export const memberParamsSchema = teamParamsSchema.extend({
  userId: z.string().min(1),
})
const role = z.enum(['LEAD', 'MEMBER'])
const autoAssign = z.enum(['NONE', 'ROUND_ROBIN', 'LEAST_BUSY'])
export const listTeamsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  includeMembers: z.enum(['true']).optional(),
})
export const createTeamBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
  autoAssign: autoAssign.optional(),
  createdBy: z.string().min(1),
  members: z
    .array(z.object({ userId: z.string().min(1), role: role.optional() }))
    .optional(),
})
export const updateTeamBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    color: z.string().trim().max(100).nullable().optional(),
    isDefault: z.boolean().optional(),
    autoAssign: autoAssign.optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  })
  .refine((x) => Object.keys(x).length > 0)
export const deleteTeamBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).optional(),
})
export const memberBodySchema = z.object({
  userId: z.string().min(1),
  role: role.optional(),
  addedBy: z.string().min(1),
})
export const updateMemberBodySchema = z.object({ role })
