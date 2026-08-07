import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

/**
 * Feature-flag contracts.
 *
 * Ported from `domains/features/schemas.py`. Wire fields are `snake_case`;
 * request bodies are strict where the Pydantic model rejected unknown fields.
 */

export const featureSchema = z
  .object({
    object: z.literal('feature').meta({ description: "Always 'feature'." }),
    id: z.string(),
    provider: z.string(),
    provider_feature_id: z.string().nullable(),
    provider_environment_id: z.string().nullable(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string()),
    enabled: z.boolean(),
    default_value: z.boolean(),
    value_type: z.string().nullable(),
    value: z.unknown().nullable(),
    server_side_only: z.boolean(),
    archived_at: z.number().int().nullable(),
    parent_feature_id: z.string().nullable(),
    provider_metadata: z.record(z.string(), z.unknown()).nullable(),
    consumer_default_enabled: z.boolean(),
    scope: z.string(),
    app_id: z.string().nullable(),
    synced_at: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Feature' })

export const userFeatureSchema = z
  .object({
    object: z.literal('user_feature'),
    id: z.string(),
    user_id: z.string(),
    feature_id: z.string(),
    slug: z.string(),
    status: z.string(),
    note: z.string().nullable(),
    synced_at: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'UserFeature' })

export const orgFeatureSchema = z
  .object({
    object: z.literal('org_feature'),
    id: z.string(),
    organization_id: z.string(),
    feature_id: z.string(),
    slug: z.string(),
    status: z.string(),
    note: z.string().nullable(),
    synced_at: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrgFeature' })

export const orgFeatureGrantItemSchema = z
  .object({
    object: z.literal('org_feature_grant'),
    id: z.string(),
    organization_id: z.string(),
    feature_id: z.string(),
    slug: z.string(),
    status: z.string(),
    note: z.string().nullable(),
    organization_name: z.string().nullable(),
    organization_slug: z.string(),
    organization_logo_url: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrgFeatureGrantItem' })

export const userFeatureGrantItemSchema = z
  .object({
    object: z.literal('user_feature_grant'),
    id: z.string(),
    user_id: z.string(),
    feature_id: z.string(),
    slug: z.string(),
    status: z.string(),
    note: z.string().nullable(),
    user_email: z.string(),
    user_first_name: z.string(),
    user_last_name: z.string(),
    user_username: z.string().nullable(),
    user_avatar: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'UserFeatureGrantItem' })

export const featureGrantsSchema = z
  .object({
    object: z.literal('feature_grants'),
    feature_id: z.string(),
    organizations: z.object({
      object: z.literal('list'),
      data: z.array(orgFeatureGrantItemSchema),
      has_more: z.boolean(),
      url: z.string(),
      total_count: z.number().int().nullable(),
    }),
    users: z.object({
      object: z.literal('list'),
      data: z.array(userFeatureGrantItemSchema),
      has_more: z.boolean(),
      url: z.string(),
      total_count: z.number().int().nullable(),
    }),
  })
  .meta({ id: 'FeatureGrants' })

export const featureDeletedSchema = z.object({
  object: z.literal('feature'),
  id: z.string(),
  deleted: z.literal(true),
})

export const userFeatureDeletedSchema = z.object({
  object: z.literal('user_feature'),
  id: z.string(),
  deleted: z.literal(true),
})

export const orgFeatureDeletedSchema = z.object({
  object: z.literal('org_feature'),
  id: z.string(),
  deleted: z.literal(true),
})

export const createFeatureBodySchema = z.strictObject({
  name: z.string().min(1),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  default_enabled: z.boolean().optional().default(false),
  scope: z.string().nullable().optional(),
  consumer_default_enabled: z.boolean().optional().default(false),
  default_value: z.boolean().nullable().optional(),
  app_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  value_type: z.string().nullable().optional(),
  value: z.unknown().nullable().optional(),
  server_side_only: z.boolean().optional().default(true),
  parent_feature_id: z.string().nullable().optional(),
})

export const updateFeatureBodySchema = z.strictObject({
  description: z.string().nullable().optional(),
  enabled: z.boolean().nullable().optional(),
  app_id: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  consumer_default_enabled: z.boolean().nullable().optional(),
  scope: z.string().nullable().optional(),
  default_value: z.boolean().nullable().optional(),
  value_type: z.string().nullable().optional(),
  value: z.unknown().nullable().optional(),
  server_side_only: z.boolean().nullable().optional(),
  archived: z.boolean().nullable().optional(),
  parent_feature_id: z.string().nullable().optional(),
})

export const grantUserFeatureBodySchema = z.strictObject({
  feature_id: z.string(),
  enabled: z.boolean().optional().default(true),
  note: z.string().nullable().optional(),
})

export const updateUserFeatureBodySchema = z.strictObject({
  enabled: z.boolean().nullable().optional(),
  note: z.string().nullable().optional(),
})

export const grantOrgFeatureBodySchema = z.strictObject({
  feature_id: z.string(),
  enabled: z.boolean().optional().default(true),
  note: z.string().nullable().optional(),
})

export const updateOrgFeatureBodySchema = z.strictObject({
  enabled: z.boolean().nullable().optional(),
  note: z.string().nullable().optional(),
})

export const listFeaturesQuerySchema = paginationQuerySchema.extend({
  appId: z.string().optional(),
  search: z.string().optional(),
  rootOnly: z.stringbool().optional(),
  includeTag: z.string().optional(),
  excludeTag: z.string().optional(),
})

export const evaluateFeaturesQuerySchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  appId: z.string().optional(),
  appSlug: z.string().optional(),
})

export const evaluateMeQuerySchema = z.object({
  organizationId: z.string().optional(),
  appSlug: z.string().optional(),
})

export const featureIdParamsSchema = z.strictObject({ feature_id: z.string() })
export const userIdParamsSchema = z.strictObject({ user_id: z.string() })
export const userFeatureParamsSchema = z.strictObject({
  user_id: z.string(),
  feature_id: z.string(),
})
export const organizationIdParamsSchema = z.strictObject({
  organization_id: z.string(),
})
export const orgFeatureParamsSchema = z.strictObject({
  organization_id: z.string(),
  feature_id: z.string(),
})

export type Feature = z.infer<typeof featureSchema>
export type UserFeature = z.infer<typeof userFeatureSchema>
export type OrgFeature = z.infer<typeof orgFeatureSchema>
export type CreateFeatureBody = z.infer<typeof createFeatureBodySchema>
export type UpdateFeatureBody = z.infer<typeof updateFeatureBodySchema>
export type GrantUserFeatureBody = z.infer<typeof grantUserFeatureBodySchema>
export type UpdateUserFeatureBody = z.infer<typeof updateUserFeatureBodySchema>
export type GrantOrgFeatureBody = z.infer<typeof grantOrgFeatureBodySchema>
export type UpdateOrgFeatureBody = z.infer<typeof updateOrgFeatureBodySchema>
export type ListFeaturesQuery = z.infer<typeof listFeaturesQuerySchema>
export type EvaluateFeaturesQuery = z.infer<typeof evaluateFeaturesQuerySchema>
export type EvaluateMeQuery = z.infer<typeof evaluateMeQuerySchema>
