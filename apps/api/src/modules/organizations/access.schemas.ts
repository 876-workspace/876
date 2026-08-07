import { z } from 'zod'

export const organizationRoleSchema = z
  .object({
    object: z.literal('organization_role'),
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    display_name: z.string(),
    description: z.string().nullable(),
    permissions: z.array(z.string()),
    is_system: z.boolean(),
    members_count: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrganizationRole' })

export type OrganizationRole = z.infer<typeof organizationRoleSchema>

export const organizationRoleCreateSchema = z.strictObject({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  display_name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  permissions: z.array(z.string()),
})

export type OrganizationRoleCreate = z.infer<
  typeof organizationRoleCreateSchema
>

export const organizationRoleUpdateSchema = z.strictObject({
  display_name: z.string().min(1).max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  permissions: z.array(z.string()).optional().nullable(),
})

export type OrganizationRoleUpdate = z.infer<
  typeof organizationRoleUpdateSchema
>

export const organizationRoleDeleteSchema = z.object({
  object: z.literal('organization_role'),
  id: z.string(),
  deleted: z.literal(true),
})

export const permissionGroupSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()),
})

export const permissionCatalogSchema = z
  .object({
    object: z.literal('permission_catalog'),
    groups: z.array(permissionGroupSchema),
  })
  .meta({ id: 'PermissionCatalog' })

export type PermissionCatalog = z.infer<typeof permissionCatalogSchema>

export const organizationMemberSchema = z
  .object({
    object: z.literal('organization_member'),
    id: z.string(),
    user_id: z.string(),
    role: z.string(),
    role_id: z.string().nullable(),
    status: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string().nullable(),
    avatar: z.string().nullable(),
    created_at: z.number().int(),
  })
  .meta({ id: 'OrganizationMember' })

export type OrganizationMember = z.infer<typeof organizationMemberSchema>

export const organizationMemberMeSchema = organizationMemberSchema.extend({
  permissions: z.array(z.string()),
})

export type OrganizationMemberMe = z.infer<typeof organizationMemberMeSchema>

export const organizationMemberDeleteSchema = z.object({
  object: z.literal('organization_member'),
  id: z.string(),
  deleted: z.literal(true),
})

export const organizationMemberRoleUpdateSchema = z.strictObject({
  role: z.string().min(1).max(64),
})

export type OrganizationMemberRoleUpdate = z.infer<
  typeof organizationMemberRoleUpdateSchema
>

export const appAssignmentSchema = z
  .object({
    object: z.literal('app_assignment'),
    id: z.string(),
    organization_id: z.string(),
    user_id: z.string(),
    app_id: z.string(),
    app_slug: z.string().nullable(),
    app_name: z.string().nullable(),
    status: z.string(),
    assigned_by: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'AppAssignment' })

export type AppAssignment = z.infer<typeof appAssignmentSchema>

export const appAssignmentCreateSchema = z.strictObject({
  user_id: z.string().min(1),
  app_id: z.string().optional().nullable(),
  app_slug: z.string().optional().nullable(),
})

export type AppAssignmentCreate = z.infer<typeof appAssignmentCreateSchema>

export const orgIdParamsSchema = z.strictObject({ org_id: z.string() })
export const roleIdParamsSchema = z.strictObject({
  org_id: z.string(),
  role_id: z.string(),
})
export const membershipIdParamsSchema = z.strictObject({
  org_id: z.string(),
  membership_id: z.string(),
})
export const assignmentIdParamsSchema = z.strictObject({
  org_id: z.string(),
  assignment_id: z.string(),
})
