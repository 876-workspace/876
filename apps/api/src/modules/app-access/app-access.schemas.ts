import { z } from 'zod'

export const appPermissionKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/)
export const appRoleKeySchema = z.string().regex(/^[a-z][a-z0-9_]*$/)

export const appPermissionSchema = z
  .object({
    object: z.literal('app_permission'),
    id: z.string(),
    app_id: z.string(),
    key: appPermissionKeySchema,
    module_key: z.string(),
    action: z.string(),
    label: z.string(),
    description: z.string().nullable(),
    is_dangerous: z.boolean(),
    position: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'AppPermission' })

export const appRoleSchema = z
  .object({
    object: z.literal('app_role'),
    id: z.string(),
    app_id: z.string(),
    organization_id: z.string().nullable(),
    key: appRoleKeySchema,
    name: z.string(),
    description: z.string().nullable(),
    permissions: z.array(appPermissionKeySchema),
    is_system: z.boolean(),
    is_default: z.boolean(),
    template_key: z.string().nullable(),
    position: z.number().int(),
    members_count: z.number().int().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'AppRole' })

export const appMembershipSchema = z
  .object({
    object: z.literal('app_membership'),
    id: z.string(),
    organization_id: z.string(),
    user_id: z.string(),
    membership_id: z.string(),
    app_id: z.string(),
    app_slug: z.string(),
    app_name: z.string(),
    status: z.string(),
    assigned: z.boolean(),
    entitled: z.boolean(),
    app_role: appRoleSchema.nullable(),
    permission_grants: z.array(appPermissionKeySchema),
    permission_denies: z.array(appPermissionKeySchema),
    effective_permissions: z.array(appPermissionKeySchema),
    /** Present on the acting member's self read; omitted from admin list projections. */
    entitled_modules: z.array(z.string()).optional(),
    title: z.string().nullable(),
    attributes: z.record(z.string(), z.unknown()).nullable(),
    assigned_by: z.string().nullable(),
    assigned_at: z.number().int().nullable(),
    last_access_at: z.number().int().nullable(),
    revoked_at: z.number().int().nullable(),
    created_at: z.number().int().nullable(),
    updated_at: z.number().int().nullable(),
  })
  .meta({ id: 'AppMembership' })

export const appMembershipDeleteSchema = z.object({
  object: z.literal('app_membership'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createAppPermissionBodySchema = z.strictObject({
  key: appPermissionKeySchema,
  module_key: appRoleKeySchema,
  action: appRoleKeySchema,
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  is_dangerous: z.boolean().optional().default(false),
  position: z.number().int().optional().default(0),
})

export const updateAppPermissionBodySchema = z.strictObject({
  label: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_dangerous: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const syncAppPermissionsBodySchema = z.strictObject({
  permissions: z.array(createAppPermissionBodySchema).max(500),
})

export const createAppRoleBodySchema = z.strictObject({
  key: appRoleKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  permissions: z.array(appPermissionKeySchema).default([]),
  is_system: z.boolean().optional().default(false),
  is_default: z.boolean().optional().default(false),
  position: z.number().int().optional().default(0),
})

export const updateAppRoleBodySchema = z.strictObject({
  key: appRoleKeySchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  permissions: z.array(appPermissionKeySchema).optional(),
  is_system: z.boolean().optional(),
  is_default: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const createAppMembershipBodySchema = z
  .strictObject({
    user_id: z.string().min(1).optional(),
    membership_id: z.string().min(1).optional(),
    app_id: z.string().min(1).optional(),
    app_slug: z.string().min(1).optional(),
    app_role_id: z.string().min(1).optional(),
    permission_grants: z.array(appPermissionKeySchema).optional().default([]),
    permission_denies: z.array(appPermissionKeySchema).optional().default([]),
    title: z.string().trim().min(1).max(160).optional().nullable(),
    attributes: z.record(z.string(), z.unknown()).optional().nullable(),
    status: z.string().trim().min(1).max(32).optional().default('active'),
  })
  .superRefine((value, ctx) => {
    if (!value.user_id && !value.membership_id)
      ctx.addIssue({
        code: 'custom',
        message: 'Provide user_id or membership_id.',
      })
    if (!value.app_id && !value.app_slug)
      ctx.addIssue({ code: 'custom', message: 'Provide app_id or app_slug.' })
  })

export const updateAppMembershipBodySchema = z.strictObject({
  app_role_id: z.string().min(1).optional().nullable(),
  permission_grants: z.array(appPermissionKeySchema).optional(),
  permission_denies: z.array(appPermissionKeySchema).optional(),
  title: z.string().trim().min(1).max(160).optional().nullable(),
  attributes: z.record(z.string(), z.unknown()).optional().nullable(),
  status: z.string().trim().min(1).max(32).optional(),
})

export const appIdParamsSchema = z.strictObject({ app_id: z.string().min(1) })
export const appPermissionIdParamsSchema = z.strictObject({
  app_id: z.string().min(1),
  permission_id: z.string().min(1),
})
export const appRoleIdParamsSchema = z.strictObject({
  app_id: z.string().min(1),
  role_id: z.string().min(1),
})
export const orgAppParamsSchema = z.strictObject({
  org_id: z.string().min(1),
  app_id: z.string().min(1),
})
export const orgAppRoleIdParamsSchema = z.strictObject({
  org_id: z.string().min(1),
  app_id: z.string().min(1),
  role_id: z.string().min(1),
})
export const orgIdParamsSchema = z.strictObject({ org_id: z.string().min(1) })
export const assignmentIdParamsSchema = z.strictObject({
  org_id: z.string().min(1),
  assignment_id: z.string().min(1),
})
export const memberAppMembershipsParamsSchema = z.strictObject({
  org_id: z.string().min(1),
  membership_id: z.string().min(1),
})

export const listAppMembershipsQuerySchema = z.strictObject({
  user_id: z.string().optional(),
  app_id: z.string().optional(),
  app_slug: z.string().optional(),
  membership_id: z.string().optional(),
  status: z.string().optional(),
  include_revoked: z.stringbool().optional().default(false),
})

export type AppPermission = z.infer<typeof appPermissionSchema>
export type AppRole = z.infer<typeof appRoleSchema>
export type AppMembership = z.infer<typeof appMembershipSchema>
export type CreateAppPermissionBody = z.infer<
  typeof createAppPermissionBodySchema
>
export type UpdateAppPermissionBody = z.infer<
  typeof updateAppPermissionBodySchema
>
export type SyncAppPermissionsBody = z.infer<
  typeof syncAppPermissionsBodySchema
>
export type CreateAppRoleBody = z.infer<typeof createAppRoleBodySchema>
export type UpdateAppRoleBody = z.infer<typeof updateAppRoleBodySchema>
export type CreateAppMembershipBody = z.infer<
  typeof createAppMembershipBodySchema
>
export type UpdateAppMembershipBody = z.infer<
  typeof updateAppMembershipBodySchema
>
export type ListAppMembershipsQuery = z.infer<
  typeof listAppMembershipsQuerySchema
>
