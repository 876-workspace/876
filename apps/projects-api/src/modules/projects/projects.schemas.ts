import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const projectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const memberParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

export const projectStatusSchema = z.enum([
  'planned',
  'active',
  'paused',
  'completed',
  'canceled',
])

export const projectHealthSchema = z.enum(['on-track', 'at-risk', 'off-track'])

export const projectMemberRoleSchema = z.enum(['lead', 'member', 'viewer'])

export const listProjectsQuerySchema = z
  .strictObject({
    status: projectStatusSchema.optional(),
    lead: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
    include_archived: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'starting_after and ending_before are mutually exclusive',
  })

export const createProjectBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().optional(),
  description: z.string().trim().nullable().optional(),
  leadUserId: z.string().trim().nullable().optional(),
  status: projectStatusSchema.optional(),
  health: projectHealthSchema.optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  customerId: z.string().trim().nullable().optional(),
  defaultWorkItemTypeId: z.string().trim().min(1).nullable().optional(),
  position: z.number().int().optional(),
})

export const updateProjectBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    key: z.string().trim().optional(),
    description: z.string().trim().nullable().optional(),
    leadUserId: z.string().trim().nullable().optional(),
    status: projectStatusSchema.optional(),
    health: projectHealthSchema.optional(),
    startDate: z.number().int().nullable().optional(),
    targetDate: z.number().int().nullable().optional(),
    customerId: z.string().trim().nullable().optional(),
    defaultWorkItemTypeId: z.string().trim().min(1).nullable().optional(),
    position: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const addMemberBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  role: projectMemberRoleSchema.optional(),
})

export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type ProjectHealth = z.infer<typeof projectHealthSchema>
export type ProjectMemberRole = z.infer<typeof projectMemberRoleSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
export type AddMemberBody = z.infer<typeof addMemberBodySchema>
