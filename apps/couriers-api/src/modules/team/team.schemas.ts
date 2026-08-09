import { z } from 'zod'

const systemKeySchema = z.enum(['admin', 'staff'])
const memberStatusSchema = z.enum(['active', 'inactive'])
export const roleSchema = z
  .object({
    object: z.literal('role'),
    id: z.string(),
    tenant_id: z.string(),
    name: z.string(),
    description: z.string(),
    permissions: z.array(z.string()),
    is_default: z.boolean(),
    system_key: systemKeySchema.nullable(),
    member_count: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Role' })
export const teamMemberSchema = z
  .object({
    object: z.literal('team_member'),
    id: z.string(),
    tenant_id: z.string(),
    user_id: z.string(),
    role_id: z.string(),
    role_name: z.string(),
    role_system_key: systemKeySchema.nullable(),
    status: memberStatusSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'TeamMember' })
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export const idParamsSchema = tenantParamsSchema.extend({
  id: z.string().min(1),
})
export const roleBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(64),
  description: z.string().max(280).optional(),
  permissions: z.array(z.string()),
})
export const rolePatchBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(64).optional(),
  description: z.string().max(280).optional(),
  permissions: z.array(z.string()).optional(),
})
export const memberBodySchema = z.strictObject({
  user_id: z.string().min(1),
  role_id: z.string().min(1),
})
export const memberPatchBodySchema = z.strictObject({
  role_id: z.string().min(1).optional(),
  status: memberStatusSchema.optional(),
})
export type Role = z.infer<typeof roleSchema>
export type TeamMember = z.infer<typeof teamMemberSchema>
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type IdParams = z.infer<typeof idParamsSchema>
export type RoleBody = z.infer<typeof roleBodySchema>
export type RolePatchBody = z.infer<typeof rolePatchBodySchema>
export type MemberBody = z.infer<typeof memberBodySchema>
export type MemberPatchBody = z.infer<typeof memberPatchBodySchema>
