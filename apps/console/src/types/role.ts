import * as z from 'zod'

/** A Console role as returned by the MC DB. */
export const roleViewSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  userCount: z.number().int(),
})
export type RoleView = z.infer<typeof roleViewSchema>

/** Parameters for creating a new role. */
export const roleCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})
export type RoleCreateParams = z.input<typeof roleCreateParamsSchema>

/** Parameters for updating a role (all fields optional). */
export const roleUpdateParamsSchema = z.strictObject({
  displayName: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})
export type RoleUpdateParams = z.input<typeof roleUpdateParamsSchema>

/** Parameters for listing roles. */
export const roleListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
})
export type RoleListParams = z.input<typeof roleListParamsSchema>

/** Parameters for retrieving a single role by name. */
export const roleRetrieveParamsSchema = z.strictObject({
  name: z.string(),
})
export type RoleRetrieveParams = z.input<typeof roleRetrieveParamsSchema>

/** Parameters for searching roles. */
export const roleSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type RoleSearchParams = z.input<typeof roleSearchParamsSchema>

/** Response for a deleted role. */
export const deletedRoleSchema = z.object({
  name: z.string(),
  deleted: z.literal(true),
})
export type DeletedRole = z.infer<typeof deletedRoleSchema>

/**
 * Roles that can be assigned via the MC UI.
 * 'user' is the sentinel for no MC access (revokes by deleting the member row).
 */
export const ASSIGNABLE_ROLES = [
  'user',
  'staff',
  'admin',
  'owner',
  'super_admin',
] as const
export const assignableRoleSchema = z.enum([
  'user',
  'staff',
  'admin',
  'owner',
  'super_admin',
])
export type AssignableRole = z.infer<typeof assignableRoleSchema>

/** Seed definition for a built-in system role. */
export const systemRoleSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
})
export type SystemRole = z.infer<typeof systemRoleSchema>
