import { z } from 'zod'

export const roleSchema = z.object({
  object: z.literal('role'),
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  is_default: z.boolean(),
  system_key: z.enum(['admin', 'staff']).nullable(),
  member_count: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const roleListSchema = z.object({
  object: z.literal('list'),
  data: z.array(roleSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const deletedRoleSchema = z.object({
  object: z.literal('role'),
  id: z.string(),
  deleted: z.literal(true),
})

export type Role = z.infer<typeof roleSchema>
export type RoleList = z.infer<typeof roleListSchema>
export type DeletedRole = z.infer<typeof deletedRoleSchema>

export const createRoleBodySchema = z.strictObject({
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
})

export const updateRoleBodySchema = z.strictObject({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

export type CreateRoleBody = z.input<typeof createRoleBodySchema>
export type UpdateRoleBody = z.input<typeof updateRoleBodySchema>
