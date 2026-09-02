import * as z from 'zod'

export const sdk876AppRoleSchema = z.strictObject({
  object: z.literal('app_role'),
  id: z.string(),
  app_id: z.string(),
  organization_id: z.string().nullable(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  is_system: z.boolean(),
  is_default: z.boolean(),
  template_key: z.string().nullable(),
  position: z.number().int(),
  members_count: z.number().int().nullable(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const sdk876AppMembershipSchema = z.strictObject({
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
  app_role: sdk876AppRoleSchema.nullable(),
  permission_grants: z.array(z.string()),
  permission_denies: z.array(z.string()),
  effective_permissions: z.array(z.string()),
  title: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()).nullable(),
  assigned_by: z.string().nullable(),
  assigned_at: z.number().int().nullable(),
  last_access_at: z.number().int().nullable(),
  revoked_at: z.number().int().nullable(),
  created_at: z.number().int().nullable(),
  updated_at: z.number().int().nullable(),
})

export const sdk876AppMembershipListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876AppMembershipSchema),
  has_more: z.boolean(),
  total_count: z.number().nullable().optional(),
  url: z.string(),
})

export const sdk876EntitledAppsSchema = z.array(
  z
    .object({
      app_id: z.string(),
      status: z.string(),
    })
    .passthrough()
)

export type AppRole = z.infer<typeof sdk876AppRoleSchema>
export type AppMembership = z.infer<typeof sdk876AppMembershipSchema>
export type AppMembershipList = z.infer<typeof sdk876AppMembershipListSchema>

export const sdk876AppRoleListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876AppRoleSchema),
  has_more: z.boolean(),
  total_count: z.number().nullable().optional(),
  url: z.string(),
})

/**
 * Body accepted by `POST /organizations/{org_id}/app-memberships`.
 *
 * Mirrors `createAppMembershipBodySchema` in the identity API: the target member
 * is named by `user_id` **or** `membership_id`, and the app by `app_id` **or**
 * `app_slug`. The API rejects a body that supplies neither, so this schema stays
 * permissive about the pair and lets the owning service decide.
 */
export const sdk876AppMembershipCreateParamsSchema = z.strictObject({
  user_id: z.string().min(1).optional(),
  membership_id: z.string().min(1).optional(),
  app_id: z.string().min(1).optional(),
  app_slug: z.string().min(1).optional(),
  app_role_id: z.string().min(1).optional(),
  permission_grants: z.array(z.string()).optional(),
  permission_denies: z.array(z.string()).optional(),
  title: z.string().min(1).max(160).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.string().min(1).max(32).optional(),
})

/** Body accepted by `PATCH /organizations/{org_id}/app-memberships/{id}`. */
export const sdk876AppMembershipUpdateParamsSchema = z.strictObject({
  app_role_id: z.string().min(1).nullable().optional(),
  permission_grants: z.array(z.string()).optional(),
  permission_denies: z.array(z.string()).optional(),
  title: z.string().min(1).max(160).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.string().min(1).max(32).optional(),
})

export const sdk876DeletedAppMembershipSchema = z.strictObject({
  object: z.literal('app_membership'),
  id: z.string(),
  deleted: z.literal(true),
})

export type AppRoleList = z.infer<typeof sdk876AppRoleListSchema>
export type AppMembershipCreateParams = z.infer<
  typeof sdk876AppMembershipCreateParamsSchema
>
export type AppMembershipUpdateParams = z.infer<
  typeof sdk876AppMembershipUpdateParamsSchema
>
export type DeletedAppMembership = z.infer<
  typeof sdk876DeletedAppMembershipSchema
>
