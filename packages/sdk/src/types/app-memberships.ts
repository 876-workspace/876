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
