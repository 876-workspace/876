import * as z from 'zod'

const defaultRoleKeySchema = z.enum(['admin', 'staff'])
const roleNameSchema = z.string().trim().min(1).max(64)

export const roleViewSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  isDefault: z.boolean(),
  systemKey: defaultRoleKeySchema.nullable(),
  memberCount: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type RoleView = z.infer<typeof roleViewSchema>

export const roleCreateParamsSchema = z.strictObject({
  name: roleNameSchema,
  description: z.string().max(280).optional(),
  permissions: z.array(z.string()),
})
export type RoleCreateParams = z.infer<typeof roleCreateParamsSchema>

export const roleUpdateParamsSchema = z.strictObject({
  name: roleNameSchema.optional(),
  description: z.string().max(280).optional(),
  permissions: z.array(z.string()).optional(),
})
export type RoleUpdateParams = z.infer<typeof roleUpdateParamsSchema>

export const deletedRoleSchema = z.strictObject({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedRole = z.infer<typeof deletedRoleSchema>
